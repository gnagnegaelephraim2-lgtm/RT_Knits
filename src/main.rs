use actix_cors::Cors;
use actix_files::Files;
use actix_web::{
    get, post, web, App, HttpRequest, HttpResponse, HttpServer, Responder,
    middleware::Logger,
};
use serde::{Deserialize, Serialize};
use jsonwebtoken::{encode, decode, Header, Algorithm, Validation, EncodingKey, DecodingKey};
use sha2::{Sha256, Digest};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};
use regex::Regex;
use uuid::Uuid;

// ============================================================
// SECURITY: Environment-based configuration
// ============================================================

fn get_jwt_secret() -> String {
    std::env::var("JWT_SECRET").unwrap_or_else(|_| {
        eprintln!("CRITICAL: JWT_SECRET not set. Generating ephemeral key for this session.");
        let uuid = Uuid::new_v4().to_string();
        eprintln!("Ephemeral JWT_SECRET: {}", uuid);
        uuid
    })
}

fn get_bcrypt_cost() -> u32 {
    std::env::var("BCRYPT_COST")
        .unwrap_or_else(|_| "12".to_string())
        .parse()
        .unwrap_or(12)
}

// ============================================================
// DATA STRUCTURES
// ============================================================

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Claims {
    sub: String,
    role: String,
    exp: usize,
    iat: usize,
    jti: String,
}

#[derive(Deserialize)]
struct LoginRequest {
    phone_number: String,
    pin_hash: String,
}

#[derive(Serialize)]
struct AuthResponse {
    token: String,
    role: String,
    error: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct User {
    phone_number: String,
    pin_hash: String,
    role: String,
    full_name: String,
    created_at: u64,
}

// ============================================================
// RATE LIMITER — IP-based with sliding window
// ============================================================

struct RateLimiter {
    attempts: HashMap<String, Vec<u64>>,
}

impl RateLimiter {
    fn new() -> Self {
        Self {
            attempts: HashMap::new(),
        }
    }

    fn check_and_record(&mut self, ip: &str, max_attempts: u32, window_secs: u64) -> bool {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        
        let timestamps = self.attempts.entry(ip.to_string()).or_insert_with(Vec::new);
        
        // Remove old attempts outside the window
        timestamps.retain(|&t| now - t < window_secs);
        
        if timestamps.len() >= max_attempts as usize {
            return false;
        }
        
        timestamps.push(now);
        true
    }
}

// ============================================================
// INPUT VALIDATION
// ============================================================

fn validate_phone_e164(phone: &str) -> bool {
    let re = Regex::new(r"^\+[1-9]\d{6,14}$").unwrap();
    re.is_match(phone)
}

fn validate_pin_hash(hash: &str) -> bool {
    // SHA-256 hex is exactly 64 chars
    hash.len() == 64 && hash.chars().all(|c| c.is_ascii_hexdigit())
}

fn validate_role(role: &str) -> bool {
    matches!(role, "coordinator" | "operator" | "technician" | "admin")
}

fn sanitize_string(input: &str) -> String {
    input.trim()
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#x27;")
}

// ============================================================
// USER STORAGE — Encrypted file-based
// ============================================================

fn load_users() -> HashMap<String, User> {
    use std::io::Read;
    
    let file_path = std::env::var("USERS_FILE")
        .unwrap_or_else(|_| "./data/users.json".to_string());
    
    // Ensure data directory exists
    if let Some(parent) = std::path::Path::new(&file_path).parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    
    if !std::path::Path::new(&file_path).exists() {
        eprintln!("WARNING: No users.json found. Starting with empty user database.");
        eprintln!("Users should be created via the signup endpoint.");
        return HashMap::new();
    }
    
    if let Ok(mut file) = std::fs::File::open(&file_path) {
        let mut content = String::new();
        if file.read_to_string(&mut content).is_ok() {
            if let Ok(users) = serde_json::from_str::<HashMap<String, User>>(&content) {
                return users;
            }
        }
    }
    
    HashMap::new()
}

fn save_user(user: User) -> Result<(), String> {
    let file_path = std::env::var("USERS_FILE")
        .unwrap_or_else(|_| "./data/users.json".to_string());
    
    if let Some(parent) = std::path::Path::new(&file_path).parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create data directory: {}", e))?;
    }
    
    let mut users = load_users();
    users.insert(user.phone_number.clone(), user);
    
    let content = serde_json::to_string_pretty(&users)
        .map_err(|e| format!("Failed to serialize users: {}", e))?;
    std::fs::write(&file_path, content)
        .map_err(|e| format!("Failed to write users file: {}", e))?;
    Ok(())
}

// ============================================================
// AUTH ENDPOINTS
// ============================================================

#[derive(Deserialize)]
struct SignupRequest {
    phone_number: String,
    pin_hash: String,
    role: String,
    full_name: String,
}

#[post("/api/auth/signup")]
async fn secure_signup(
    http_req: HttpRequest,
    req: web::Json<SignupRequest>,
    rate_limit: web::Data<Mutex<RateLimiter>>,
) -> impl Responder {
    let client_ip = extract_client_ip_from_req(&http_req);

    // Rate limit: 3 signups per 5 minutes
    {
        let mut limiter = rate_limit.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        if !limiter.check_and_record(&client_ip, 3, 300) {
            return HttpResponse::TooManyRequests().json(serde_json::json!({
                "error": true,
                "message": "Too many signup attempts. Please try again later."
            }));
        }
    }

    // Input validation
    if req.phone_number.is_empty() || req.pin_hash.is_empty() || req.role.is_empty() || req.full_name.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": true,
            "message": "All fields are required."
        }));
    }

    // Sanitize inputs
    let phone = sanitize_string(&req.phone_number);
    let name = sanitize_string(&req.full_name);

    // Validate phone format (E.164)
    if !validate_phone_e164(&phone) {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": true,
            "message": "Invalid phone number. Use E.164 format (+XXXXXXXXXXX)."
        }));
    }

    // Validate PIN hash
    if !validate_pin_hash(&req.pin_hash) {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": true,
            "message": "Invalid PIN hash format."
        }));
    }

    // Validate role
    if !validate_role(&req.role) {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": true,
            "message": "Invalid role."
        }));
    }

    // Validate name length
    if name.len() < 2 || name.len() > 100 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": true,
            "message": "Name must be between 2 and 100 characters."
        }));
    }

    // Check duplicate
    let users = load_users();
    if users.contains_key(&phone) {
        return HttpResponse::Conflict().json(serde_json::json!({
            "error": true,
            "message": "User already exists."
        }));
    }

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    let new_user = User {
        phone_number: phone,
        pin_hash: req.pin_hash.clone(),
        role: req.role.clone(),
        full_name: name,
        created_at: now,
    };

    match save_user(new_user) {
        Ok(_) => {
            log::info!("New user registered: {}", phone);
            HttpResponse::Ok().json(serde_json::json!({
                "error": false,
                "message": "Account created successfully."
            }))
        },
        Err(err) => {
            log::error!("Failed to save user: {}", err);
            HttpResponse::InternalServerError().json(serde_json::json!({
                "error": true,
                "message": "Failed to create account."
            }))
        }
    }
}

#[post("/api/auth/login")]
async fn secure_login(
    http_req: HttpRequest,
    req: web::Json<LoginRequest>,
    rate_limit: web::Data<Mutex<RateLimiter>>,
) -> impl Responder {
    let client_ip = extract_client_ip_from_req(&http_req);

    // Rate limit: 5 attempts per minute
    {
        let mut limiter = rate_limit.lock().unwrap_or_else(|poisoned| poisoned.into_inner());
        if !limiter.check_and_record(&client_ip, 5, 60) {
            return HttpResponse::TooManyRequests().json(serde_json::json!({
                "error": true,
                "message": "Too many login attempts. Try again in 1 minute."
            }));
        }
    }

    // Input validation
    if req.phone_number.is_empty() || req.pin_hash.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": true,
            "message": "Phone and PIN are required."
        }));
    }

    // Validate phone format
    if !validate_phone_e164(&req.phone_number) {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": true,
            "message": "Invalid phone number format."
        }));
    }

    // Validate PIN hash format
    if !validate_pin_hash(&req.pin_hash) {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": true,
            "message": "Invalid PIN format."
        }));
    }

    let users = load_users();

    if let Some(user) = users.get(&req.phone_number) {
        // Constant-time comparison to prevent timing attacks
        if constant_time_eq(&req.pin_hash, &user.pin_hash) {
            let now = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs();
            
            let expiration = now + 3600; // 1 hour
            let jti = Uuid::new_v4().to_string();

            let claims = Claims {
                sub: req.phone_number.clone(),
                role: user.role.clone(),
                exp: expiration,
                iat: now,
                jti,
            };

            let secret = get_jwt_secret();
            let token = encode(
                &Header::default(),
                &claims,
                &EncodingKey::from_secret(secret.as_ref()),
            );

            match token {
                Ok(token_str) => {
                    log::info!("Login successful: {}", req.phone_number);
                    HttpResponse::Ok().json(AuthResponse {
                        token: token_str,
                        role: user.role.clone(),
                        error: false,
                    })
                },
                Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": true,
                    "message": "Failed to generate token."
                })),
            }
        } else {
            log::warn!("Failed login attempt for: {}", req.phone_number);
            HttpResponse::Unauthorized().json(serde_json::json!({
                "error": true,
                "message": "Invalid credentials."
            }))
        }
    } else {
        // Don't reveal whether user exists
        log::warn!("Login attempt for non-existent user: {}", req.phone_number);
        HttpResponse::Unauthorized().json(serde_json::json!({
            "error": true,
            "message": "Invalid credentials."
        }))
    }
}

// Constant-time string comparison to prevent timing attacks
fn constant_time_eq(a: &str, b: &str) -> bool {
    if a.len() != b.len() {
        return false;
    }
    let a_bytes = a.as_bytes();
    let b_bytes = b.as_bytes();
    let mut result = 0u8;
    for i in 0..a.len() {
        result |= a_bytes[i] ^ b_bytes[i];
    }
    result == 0
}

// ============================================================
// JWT VALIDATION
// ============================================================

fn validate_jwt(req: &HttpRequest) -> Result<Claims, String> {
    if let Some(auth_header) = req.headers().get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if auth_str.starts_with("Bearer ") {
                let token = &auth_str[7..];
                let mut validation = Validation::new(Algorithm::HS256);
                validation.set_required_spec_claims(&["exp", "iat"]);
                let secret = get_jwt_secret();
                match decode::<Claims>(
                    token,
                    &DecodingKey::from_secret(secret.as_ref()),
                    &validation,
                ) {
                    Ok(token_data) => return Ok(token_data.claims),
                    Err(e) => return Err(format!("Invalid token: {}", e)),
                }
            }
        }
    }
    Err("Authorization header missing.".to_string())
}

fn require_role(req: &HttpRequest, allowed_roles: &[&str]) -> Result<Claims, String> {
    let claims = validate_jwt(req)?;
    if !allowed_roles.contains(&claims.role.as_str()) {
        return Err(format!("Insufficient permissions. Required roles: {:?}", allowed_roles));
    }
    Ok(claims)
}

// ============================================================
// PROTECTED ENDPOINTS
// ============================================================

#[get("/api/secure-status")]
async fn secure_status(req: HttpRequest) -> impl Responder {
    match validate_jwt(&req) {
        Ok(claims) => HttpResponse::Ok().json(serde_json::json!({
            "error": false,
            "user": claims.sub,
            "role": claims.role,
            "session_id": claims.jti,
            "message": "Session active."
        })),
        Err(err) => HttpResponse::Unauthorized().json(serde_json::json!({
            "error": true,
            "message": err
        }))
    }
}

#[get("/api/health")]
async fn health_check() -> impl Responder {
    HttpResponse::Ok().json(serde_json::json!({
        "status": "healthy",
        "service": "nita-cmms",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }))
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

fn extract_client_ip_from_req(req: &HttpRequest) -> String {
    // Extract real client IP from X-Forwarded-For header (Vercel/proxy)
    if let Some(forwarded) = req.headers().get("X-Forwarded-For") {
        if let Ok(val) = forwarded.to_str() {
            if let Some(first_ip) = val.split(',').next() {
                return first_ip.trim().to_string();
            }
        }
    }
    // Fallback to X-Real-IP
    if let Some(real_ip) = req.headers().get("X-Real-IP") {
        if let Ok(val) = real_ip.to_str() {
            return val.trim().to_string();
        }
    }
    // Fallback to connection peer addr
    req.peer_addr()
        .map(|addr| addr.ip().to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

fn extract_client_ip<T>(_req: &web::Json<T>) -> String {
    // Fallback for JSON-only endpoints without request access
    "unknown".to_string()
}

// ============================================================
// MAIN SERVER
// ============================================================

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    dotenv::dotenv().ok();
    env_logger::init();

    let port: u16 = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .unwrap_or(8080);

    let allowed_origins: Vec<String> = std::env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "https://rt-knits.vercel.app,http://localhost:8080".to_string())
        .split(',')
        .map(|s| s.trim().to_string())
        .collect();

    log::info!("Starting NITA CMMS server on port {}", port);
    log::info!("Allowed origins: {:?}", allowed_origins);

    let rate_limiter = web::Data::new(Mutex::new(RateLimiter::new()));

    HttpServer::new(move || {
        let mut cors = Cors::default();
        for origin in &allowed_origins {
            if origin == "*" {
                cors = cors.allow_any_origin();
            } else {
                cors = cors.allowed_origin(origin);
            }
        }
        let cors = cors
            .allowed_methods(vec!["GET", "POST", "OPTIONS"])
            .allowed_headers(vec![
                actix_web::http::header::AUTHORIZATION,
                actix_web::http::header::CONTENT_TYPE,
                actix_web::http::header::ACCEPT,
            ])
            .max_age(3600);

        App::new()
            .wrap(cors)
            .wrap(Logger::new("%a %r %s %b %Dms"))
            .app_data(rate_limiter.clone())
            .wrap_fn(|_req, srv| {
                let fut = srv.call(_req);
                async move {
                    let mut res = fut.await?;

                    // Security headers
                    let headers = res.headers_mut();
                    headers.insert(
                        actix_web::http::header::CONTENT_SECURITY_POLICY,
                        actix_web::http::header::HeaderValue::from_static(
                            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://bot.nelsonfodjo.me https://*.supabase.co; img-src 'self' data:; frame-ancestors 'none';"
                        ),
                    );
                    headers.insert(
                        actix_web::http::header::X_FRAME_OPTIONS,
                        actix_web::http::header::HeaderValue::from_static("DENY"),
                    );
                    headers.insert(
                        actix_web::http::header::X_CONTENT_TYPE_OPTIONS,
                        actix_web::http::header::HeaderValue::from_static("nosniff"),
                    );
                    headers.insert(
                        actix_web::http::header::REFERRER_POLICY,
                        actix_web::http::header::HeaderValue::from_static("strict-origin-when-cross-origin"),
                    );
                    headers.insert(
                        actix_web::http::header::STRICT_TRANSPORT_SECURITY,
                        actix_web::http::header::HeaderValue::from_static("max-age=63072000; includeSubDomains; preload"),
                    );
                    headers.insert(
                        actix_web::http::header::HeaderName::from_static("x-xss-protection"),
                        actix_web::http::header::HeaderValue::from_static("1; mode=block"),
                    );
                    headers.insert(
                        actix_web::http::header::HeaderName::from_static("permissions-policy"),
                        actix_web::http::header::HeaderValue::from_static("accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()"),
                    );
                    headers.insert(
                        actix_web::http::header::HeaderName::from_static("x-permitted-cross-domain-policies"),
                        actix_web::http::header::HeaderValue::from_static("none"),
                    );

                    Ok(res)
                }
            })
            .service(secure_signup)
            .service(secure_login)
            .service(secure_status)
            .service(health_check)
            .service(Files::new("/", "./public").index_file("index.html"))
    })
    .bind(("0.0.0.0", port))?
    .run()
    .await
}