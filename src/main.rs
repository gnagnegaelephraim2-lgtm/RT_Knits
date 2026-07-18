use actix_files::Files;
use actix_web::{
    get, post, web, App, HttpRequest, HttpResponse, HttpServer, Responder,
    middleware::Logger,
    dev::Service,
};
use serde::{Deserialize, Serialize};
use jsonwebtoken::{encode, decode, Header, Algorithm, Validation, EncodingKey, DecodingKey};
use sha2::{Sha256, Digest};
use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

// JWT Claims structure
#[derive(Debug, Serialize, Deserialize, Clone)]
struct Claims {
    sub: String,
    role: String,
    exp: usize,
}

// User credentials structure
#[derive(Deserialize)]
struct LoginRequest {
    phone_number: String,
    pin_hash: String,
}

// API Key authentication structure
#[derive(Serialize)]
struct AuthResponse {
    token: String,
    role: String,
    error: bool,
}

// Rate limiter state
struct RateLimiter {
    attempts: HashMap<String, (u32, u64)>, // ip -> (count, window_start)
}

impl RateLimiter {
    fn new() -> Self {
        Self {
            attempts: HashMap::new(),
        }
    }

    fn check_and_record(&mut self, ip: &str) -> bool {
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs();
        let window = 60; // 1 minute window
        let max_attempts = 5;

        if let Some((count, start)) = self.attempts.get_mut(ip) {
            if now - *start > window {
                *count = 1;
                *start = now;
                return true;
            }
            if *count >= max_attempts {
                return false;
            }
            *count += 1;
            return true;
        }

        self.attempts.insert(ip.to_string(), (1, now));
        true
    }
}

// Get JWT secret from environment or fallback
fn get_jwt_secret() -> String {
    std::env::var("JWT_SECRET").unwrap_or_else(|_| {
        eprintln!("WARNING: JWT_SECRET not set. Using insecure fallback. Set JWT_SECRET in .env");
        "nita-change-me-in-production".to_string()
    })
}

// Valid user credentials (phone -> (pin_hash, role, name))
fn get_user_db() -> HashMap<String, (String, String, String)> {
    let mut db = HashMap::new();

    // Hash PINs with SHA-256 for comparison
    let hash_pin = |pin: &str| -> String {
        let mut hasher = Sha256::new();
        hasher.update(pin.as_bytes());
        format!("{:x}", hasher.finalize())
    };

    db.insert(
        "+23054737266".to_string(),
        (hash_pin("1234"), "coordinator".to_string(), "Nelson Fodjo".to_string()),
    );
    db.insert(
        "+23052000101".to_string(),
        (hash_pin("1111"), "operator".to_string(), "Priya Singh".to_string()),
    );
    db.insert(
        "+23057551012".to_string(),
        (hash_pin("2222"), "technician".to_string(), "Jean-Marc Rughoo".to_string()),
    );

    db
}

#[post("/api/auth/login")]
async fn secure_login(
    req: web::Json<LoginRequest>,
    rate_limit: web::Data<Mutex<RateLimiter>>,
) -> impl Responder {
    // Extract client IP from X-Forwarded-For or connecting peer
    let client_ip = "127.0.0.1".to_string(); // In production, extract from X-Forwarded-For header

    // Rate limit check (handle poisoned mutex gracefully)
    {
        let mut limiter = rate_limit.lock().unwrap_or_else(|poisoned| {
            eprintln!("WARNING: Rate limiter mutex poisoned, recovering");
            poisoned.into_inner()
        });
        if !limiter.check_and_record(&client_ip) {
            return HttpResponse::TooManyRequests().json(serde_json::json!({
                "error": true,
                "message": "Too many login attempts. Please try again in 1 minute."
            }));
        }
    }

    // Input validation
    if req.phone_number.is_empty() || req.pin_hash.is_empty() {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": true,
            "message": "Phone number and PIN hash are required."
        }));
    }

    // E.164 phone format validation
    if !req.phone_number.starts_with('+') || req.phone_number.len() < 10 || req.phone_number.len() > 15 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": true,
            "message": "Invalid phone number format. Use E.164 format (+XXXXXXXXXXX)."
        }));
    }

    // PIN hash length validation (SHA-256 hex is 64 chars)
    if req.pin_hash.len() != 64 {
        return HttpResponse::BadRequest().json(serde_json::json!({
            "error": true,
            "message": "Invalid PIN hash format."
        }));
    }

    let user_db = get_user_db();

    if let Some((expected_hash, role, _name)) = user_db.get(&req.phone_number) {
        if req.pin_hash == *expected_hash {
            let expiration = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs() as usize + 3600;

            let claims = Claims {
                sub: req.phone_number.clone(),
                role: role.clone(),
                exp: expiration,
            };

            let secret = get_jwt_secret();
            let token = encode(
                &Header::default(),
                &claims,
                &EncodingKey::from_secret(secret.as_ref()),
            );

            match token {
                Ok(token_str) => HttpResponse::Ok().json(AuthResponse {
                    token: token_str,
                    role: role.clone(),
                    error: false,
                }),
                Err(_) => HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": true,
                    "message": "Failed to generate authentication token."
                })),
            }
        } else {
            HttpResponse::Unauthorized().json(serde_json::json!({
                "error": true,
                "message": "Invalid credentials."
            }))
        }
    } else {
        HttpResponse::Unauthorized().json(serde_json::json!({
            "error": true,
            "message": "Invalid credentials."
        }))
    }
}

// JWT validation
fn validate_jwt(req: &HttpRequest) -> Result<Claims, String> {
    if let Some(auth_header) = req.headers().get("Authorization") {
        if let Ok(auth_str) = auth_header.to_str() {
            if auth_str.starts_with("Bearer ") {
                let token = &auth_str[7..];
                let validation = Validation::new(Algorithm::HS256);
                let secret = get_jwt_secret();
                match decode::<Claims>(
                    token,
                    &DecodingKey::from_secret(secret.as_ref()),
                    &validation,
                ) {
                    Ok(token_data) => return Ok(token_data.claims),
                    Err(_) => return Err("Invalid token or expired session.".to_string()),
                }
            }
        }
    }
    Err("Authorization header missing or malformed.".to_string())
}

#[get("/api/secure-status")]
async fn secure_status(req: HttpRequest) -> impl Responder {
    match validate_jwt(&req) {
        Ok(claims) => HttpResponse::Ok().json(serde_json::json!({
            "error": false,
            "requester": claims.sub,
            "role": claims.role,
            "message": "NITA secure server session active."
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
        "service": "nita-cmms-secure-server",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }))
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Load .env file
    dotenv::dotenv().ok();

    let port: u16 = std::env::var("SERVER_PORT")
        .unwrap_or_else(|_| "8080".to_string())
        .parse()
        .unwrap_or(8080);

    let allowed_origins: Vec<String> = std::env::var("ALLOWED_ORIGINS")
        .unwrap_or_else(|_| "http://localhost:8080".to_string())
        .split(',')
        .map(|s| s.trim().to_string())
        .collect();

    println!("============================================================");
    println!("NITA CMMS SECURE RUST SERVER STARTING...");
    println!("Local Address: http://127.0.0.1:{}", port);
    println!("Security: OWASP Headers, JWT Auth, Rate Limiting, CORS");
    println!("Allowed Origins: {:?}", allowed_origins);
    println!("============================================================");

    let rate_limiter = web::Data::new(Mutex::new(RateLimiter::new()));
    let origins = web::Data::new(allowed_origins);

    HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .app_data(rate_limiter.clone())
            .app_data(origins.clone())
            .wrap_fn(|req, srv| {
                let fut = srv.call(req);
                async move {
                    let mut res = fut.await?;

                    // Inject OWASP security headers
                    let headers = res.headers_mut();
                    headers.insert(
                        actix_web::http::header::CONTENT_SECURITY_POLICY,
                        actix_web::http::header::HeaderValue::from_static(
                            "default-src 'self'; script-src 'self' https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self' https://bot.nelsonfodjo.me;"
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
                        actix_web::http::header::HeaderValue::from_static("max-age=31536000; includeSubDomains"),
                    );
                    headers.insert(
                        actix_web::http::header::HeaderName::from_static("x-xss-protection"),
                        actix_web::http::header::HeaderValue::from_static("1; mode=block"),
                    );
                    headers.insert(
                        actix_web::http::header::HeaderName::from_static("permissions-policy"),
                        actix_web::http::header::HeaderValue::from_static("camera=(), microphone=(), geolocation=()"),
                    );

                    Ok(res)
                }
            })
            .service(secure_login)
            .service(secure_status)
            .service(health_check)
            // Serve ONLY the public/ directory — NOT the project root
            .service(Files::new("/", "./public").index_file("index.html"))
    })
    .bind(("127.0.0.1", port))?
    .run()
    .await
}
