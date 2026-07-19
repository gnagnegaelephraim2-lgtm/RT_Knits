// ============================================================
// RT KNITS — NITA CMMS Internationalization (i18n)
// ============================================================

const translations = {
  en: {
    // Auth
    login_subtitle: "RT Knits Maintenance Portal",
    sign_in: "Sign In",
    sign_up: "Sign Up",
    phone_label: "Phone Number",
    pin_label: "PIN",
    phone_placeholder: "+230 5XXX XXXX",
    pin_placeholder: "Enter PIN",
    create_account: "Create Account",
    full_name: "Full Name",
    role: "Role",
    department: "Department",
    select_department: "Select Department",
    trade: "Trade",
    create_pin: "Create PIN (4-6 digits)",
    operator: "Operator",
    technician: "Technician",
    coordinator: "Coordinator",
    
    // Sidebar
    dashboard: "Dashboard",
    planning: "Planning",
    task_entry: "Task Entry",
    approvals: "Approvals",
    whatsapp_sim: "WhatsApp Sim",
    my_tasks: "My Tasks",
    api_sandbox: "API Sandbox",
    data_model: "Data Model",
    documentation: "Documentation",
    mauritius: "RT Knits — Mauritius",
    sla_target: "SLA Target: 99.8%",
    
    // Dashboard
    coordinator_dashboard: "Coordinator Dashboard",
    departments: "Departments",
    approvals_count: "Approvals",
    planning_btn: "Planning",
    immediate: "Immediate",
    planned: "Planned",
    technicians: "Technicians",
    work_orders: "Work Orders",
    special_task: "Special Task",
    reports: "Reports",
    edit_planned: "Edit Planned",
    tech_status: "Tech Status",
    task_list: "Task List",
    preventive: "Preventive",
    tech_reports: "Tech Reports",
    tech_dashboard: "Tech Dashboard",
    calendar: "Calendar",
    reset_orders: "Reset Orders",
    asset_labels: "Asset Labels",
    asset_register: "Asset Register",
    multi_user: "Multi-User View",
    order_reports: "Order Reports",
    selected_department: "Selected Department",
    location: "Location",
    view_requests: "View Requests",
    new_request: "New Request",
    repair: "Repair",
    projects: "Projects",
    
    // Planning
    leakage: "Leakage",
    repairs: "Repairs",
    pending: "Pending",
    approved: "Approved",
    technician_label: "Technician",
    duration: "Duration (min)",
    person_in_charge: "Person in Charge",
    backup: "Backup",
    start_date: "Start Date",
    finish_date: "Finish Date",
    asset_filter: "Asset Filter:",
    search: "Search:",
    dispatch_engineer: "Dispatch Engineer",
    
    // Task Entry
    new_task: "New Task — Repair",
    asset_code: "Asset Code",
    search_btn: "Search",
    asset_name: "Asset Name",
    asset_type: "Asset Type",
    serial: "Serial",
    location_detail: "Location Detail",
    urgency: "Urgency",
    urgent_repairs: "Urgent Repairs",
    needed_repairs: "Needed Repairs",
    improvements: "Improvements & Projects",
    description: "Description",
    new_btn: "+ New",
    confirm: "Confirm",
    delete: "Delete",
    task_list_title: "Task List",
    planned: "Planned",
    deleted: "Deleted",
    rework: "Rework",
    unplanned: "Unplanned",
    
    // Approvals
    pending_approvals: "Pending Approvals",
    review_subtitle: "Review and approve maintenance requests",
    export: "Export",
    date_requested: "Date Requested",
    due_date: "Due Date",
    status: "Status",
    action: "Action",
    
    // WhatsApp
    scenario_presets: "Scenario Presets",
    clear: "Clear",
    system_logs: "System Logs",
    type_message: "Type a message...",
    
    // Technician
    my_job_queue: "My Job Queue",
    select_work_orders: "Select work orders to update your progress.",
    work_order: "Work Order",
    scheduled: "Scheduled",
    
    // API
    endpoint_details: "Endpoint Details",
    select_endpoint: "Select an endpoint from the dropdown above.",
    send: "Send",
    response: "Response",
    
    // Database
    tables: "Tables",
    field_name: "Field Name",
    data_type: "Data Type",
    key: "Key",
    relationships: "Relationships",
    
    // Docs
    solution_design: "1. Solution Design",
    decision_logic: "2. Decision Logic",
    data_model_doc: "3. Data Model",
    business_impact: "4. Business Impact"
  },
  
  fr: {
    // Auth
    login_subtitle: "Portail de Maintenance RT Knits",
    sign_in: "Connexion",
    sign_up: "Inscription",
    phone_label: "Numéro de Téléphone",
    pin_label: "PIN",
    phone_placeholder: "+230 5XXX XXXX",
    pin_placeholder: "Entrez le PIN",
    create_account: "Créer un Compte",
    full_name: "Nom Complet",
    role: "Rôle",
    department: "Département",
    select_department: "Sélectionner un Département",
    trade: "Métier",
    create_pin: "Créer un PIN (4-6 chiffres)",
    operator: "Opérateur",
    technician: "Technicien",
    coordinator: "Coordinateur",
    
    // Sidebar
    dashboard: "Tableau de Bord",
    planning: "Planification",
    task_entry: "Saisie de Tâche",
    approvals: "Approbations",
    whatsapp_sim: "Simulateur WhatsApp",
    my_tasks: "Mes Tâches",
    api_sandbox: "Bac à Sable API",
    data_model: "Modèle de Données",
    documentation: "Documentation",
    mauritius: "RT Knits — Île Maurice",
    sla_target: "Objectif SLA: 99.8%",
    
    // Dashboard
    coordinator_dashboard: "Tableau de Bord Coordinateur",
    departments: "Départements",
    approvals_count: "Approbations",
    planning_btn: "Planification",
    immediate: "Immédiat",
    planned: "Planifié",
    technicians: "Techniciens",
    work_orders: "Ordres de Travail",
    special_task: "Tâche Spéciale",
    reports: "Rapports",
    edit_planned: "Modifier Planifié",
    tech_status: "État Tech",
    task_list: "Liste des Tâches",
    preventive: "Préventif",
    tech_reports: "Rapports Tech",
    tech_dashboard: "Dashboard Tech",
    calendar: "Calendrier",
    reset_orders: "Réinitialiser Ordres",
    asset_labels: "Étiquettes Assets",
    asset_register: "Registre Assets",
    multi_user: "Vue Multi-Utilisateur",
    order_reports: "Rapports Ordres",
    selected_department: "Département Sélectionné",
    location: "Emplacement",
    view_requests: "Voir les Demandes",
    new_request: "Nouvelle Demande",
    repair: "Réparation",
    projects: "Projets",
    
    // Planning
    leakage: "Fuites",
    repairs: "Réparations",
    pending: "En Attente",
    approved: "Approuvé",
    technician_label: "Technicien",
    duration: "Durée (min)",
    person_in_charge: "Responsable",
    backup: "Suppléant",
    start_date: "Date de Début",
    finish_date: "Date de Fin",
    asset_filter: "Filtre Asset:",
    search: "Rechercher:",
    dispatch_engineer: "Envoyer Ingénieur",
    
    // Task Entry
    new_task: "Nouvelle Tâche — Réparation",
    asset_code: "Code Asset",
    search_btn: "Rechercher",
    asset_name: "Nom Asset",
    asset_type: "Type Asset",
    serial: "Série",
    location_detail: "Détail Emplacement",
    urgency: "Urgence",
    urgent_repairs: "Réparations Urgentes",
    needed_repairs: "Réparations Nécessaires",
    improvements: "Améliorations & Projets",
    description: "Description",
    new_btn: "+ Nouveau",
    confirm: "Confirmer",
    delete: "Supprimer",
    task_list_title: "Liste des Tâches",
    planned: "Planifié",
    deleted: "Supprimé",
    rework: "Retravail",
    unplanned: "Non Planifié",
    
    // Approvals
    pending_approvals: "Approbations en Attente",
    review_subtitle: "Examiner et approuver les demandes de maintenance",
    export: "Exporter",
    date_requested: "Date Demandée",
    due_date: "Date d'Échéance",
    status: "Statut",
    action: "Action",
    
    // WhatsApp
    scenario_presets: "Préréglages Scénarios",
    clear: "Effacer",
    system_logs: "Journaux Système",
    type_message: "Tapez un message...",
    
    // Technician
    my_job_queue: "Ma File d'Attente",
    select_work_orders: "Sélectionnez les ordres de travail pour mettre à jour votre progression.",
    work_order: "Ordre de Travail",
    scheduled: "Programmé",
    
    // API
    endpoint_details: "Détails de l'Endpoint",
    select_endpoint: "Sélectionnez un endpoint dans le menu déroulant ci-dessus.",
    send: "Envoyer",
    response: "Réponse",
    
    // Database
    tables: "Tables",
    field_name: "Nom du Champ",
    data_type: "Type de Donnée",
    key: "Clé",
    relationships: "Relations",
    
    // Docs
    solution_design: "1. Conception Solution",
    decision_logic: "2. Logique Décisionnelle",
    data_model_doc: "3. Modèle de Données",
    business_impact: "4. Impact Business"
  },
  
  cr: {
    // Auth (Kreol Morisien)
    login_subtitle: "Laport Maintenance RT Knits",
    sign_in: "Konekte",
    sign_up: "Enskri",
    phone_label: "Numéro Téléfon",
    pin_label: "PIN",
    phone_placeholder: "+230 5XXX XXXX",
    pin_placeholder: "Ékrir PIN",
    create_account: "Fér Komt",
    full_name: "Lér Nοm",
    role: "Zonn",
    department: "Départeman",
    select_department: "Séléktyon én Départeman",
    trade: "Métier",
    create_pin: "Fér PIN (4-6 chiffre)",
    operator: "Operatér",
    technician: "Tésinisyen",
    coordinator: "Koordinator",
    
    // Sidebar
    dashboard: "Tablo Bòrd",
    planning: "Planifikasion",
    task_entry: "Ékri Tâch",
    approvals: "Agréman",
    whatsapp_sim: "Similatér WhatsApp",
    my_tasks: "Mo Tâch",
    api_sandbox: "Bak API",
    data_model: "Modèl Données",
    documentation: "Dokimanasion",
    mauritius: "RT Knits — Moris",
    sla_target: "Tirget SLA: 99.8%",
    
    // Dashboard
    coordinator_dashboard: "Tablo Bòrd Koordinator",
    departments: "Départeman",
    approvals_count: "Agréman",
    planning_btn: "Planifikasion",
    immediate: "Imedyat",
    planned: "Planifié",
    technicians: "Tésinisyen",
    work_orders: "Lòd Travay",
    special_task: "Tâch Spésyal",
    reports: "Rapò",
    edit_planned: "Mofifié Planifié",
    tech_status: "Eta Tech",
    task_list: "Lis Tâch",
    preventive: "Préventif",
    tech_reports: "Rapò Tech",
    tech_dashboard: "Tablo Bòrd Tech",
    calendar: "Kalannrié",
    reset_orders: "Résè Lòd",
    asset_labels: "Étikèt Asè",
    asset_register: "Rejistr Asè",
    multi_user: "Vwaz Multi-Utilsatèr",
    order_reports: "Rapò Lòd",
    selected_department: "Départeman Séléktyoné",
    location: "Lokasion",
    view_requests: "Vwar Dimann",
    new_request: "Nouvo Dimann",
    repair: "Réparasion",
    projects: "Projè",
    
    // Planning
    leakage: "Fuit",
    repairs: "Réparasion",
    pending: "An Atandan",
    approved: "Agré",
    technician_label: "Tésinisyen",
    duration: "Duré (min)",
    person_in_charge: "Lé Réspansab",
    backup: "Siplyan",
    start_date: "Dat Début",
    finish_date: "Dat Fin",
    asset_filter: "Filt Asè:",
    search: "Chérché:",
    dispatch_engineer: "Anviyé Injinyé",
    
    // Task Entry
    new_task: "Nouvo Tâch — Réparasion",
    asset_code: "Kòd Asè",
    search_btn: "Chérché",
    asset_name: "Lér Nοm Asè",
    asset_type: "Tip Asè",
    serial: "Séry",
    location_detail: "Détaíl Lokasion",
    urgency: "Ijans",
    urgent_repairs: "Réparasion Ijant",
    needed_repairs: "Réparasion Nésésèr",
    improvements: "Améliorasian & Projè",
    description: "Déskripsion",
    new_btn: "+ Nouvo",
    confirm: "Konfirmé",
    delete: "Efassé",
    task_list_title: "Lis Tâch",
    planned: "Planifié",
    deleted: "Efassé",
    rework: "Retravay",
    unplanned: "Pa Planifié",
    
    // Approvals
    pending_approvals: "Agréman An Atandan",
    review_subtitle: "Ékzaminé ék agrété dimann mantenans",
    export: "Ékspòté",
    date_requested: "Dat Dimann",
    due_date: "Dat Échéans",
    status: "Sta",
    action: "Lasion",
    
    // WhatsApp
    scenario_presets: "Préréglaz Senaryo",
    clear: "Efassé",
    system_logs: "Jònal Sistèm",
    type_message: "Ékrir én mesaz...",
    
    // Technician
    my_job_queue: "Mo Fil Atandan",
    select_work_orders: "Séléktyon lòd travay pou met an jou prògrè wa.",
    work_order: "Lòd Travay",
    scheduled: "Programé",
    
    // API
    endpoint_details: "Détaíl Endpoint",
    select_endpoint: "Séléktyon én endpoint dan sélas déroulan anlé.",
    send: "Anviyé",
    response: "Répons",
    
    // Database
    tables: "Tab",
    field_name: "Nοm Cham",
    data_type: "Tip Données",
    key: "Lé",
    relationships: "Relasion",
    
    // Docs
    solution_design: "1. Konsepsyon Solision",
    decision_logic: "2. Lozik Déskizyonèl",
    data_model_doc: "3. Modèl Données",
    business_impact: "4. Impak Biznis"
  },
  
  hi: {
    // Auth (Hindi)
    login_subtitle: "आरटी निट्स मेंटेनेंस पोर्टल",
    sign_in: "साइन इन",
    sign_up: "साइन अप",
    phone_label: "फ़ोन नंबर",
    pin_label: "पिन",
    phone_placeholder: "+230 5XXX XXXX",
    pin_placeholder: "पिन दर्ज करें",
    create_account: "खाता बनाएं",
    full_name: "पूरा नाम",
    role: "भूमिका",
    department: "विभाग",
    select_department: "विभाग चुनें",
    trade: "व्यवसाय",
    create_pin: "पिन बनाएं (4-6 अंक)",
    operator: "ऑपरेटर",
    technician: "तकनीशियन",
    coordinator: "समन्वयक",
    
    // Sidebar
    dashboard: "डैशबोर्ड",
    planning: "योजना",
    task_entry: "कार्य प्रविष्टि",
    approvals: "अनुमोदन",
    whatsapp_sim: "व्हाट्सएप सिम",
    my_tasks: "मेरे कार्य",
    api_sandbox: "एपीआई सैंडबॉक्स",
    data_model: "डेटा मॉडल",
    documentation: "दस्तावेज़ीकरण",
    mauritius: "आरटी निट्स — मॉरीशस",
    sla_target: "एसएलए लक्ष्य: 99.8%",
    
    // Dashboard
    coordinator_dashboard: "समन्वयक डैशबोर्ड",
    departments: "विभाग",
    approvals_count: "अनुमोदन",
    planning_btn: "योजना",
    immediate: "तुरंत",
    planned: "योजनाबद्ध",
    technicians: "तकनीशियन",
    work_orders: "कार्य आदेश",
    special_task: "विशेष कार्य",
    reports: "रिपोर्ट",
    edit_planned: "योजनाबद्ध संपादित करें",
    tech_status: "तकनीक स्थिति",
    task_list: "कार्य सूची",
    preventive: "निवारक",
    tech_reports: "तकनीक रिपोर्ट",
    tech_dashboard: "तकनीक डैशबोर्ड",
    calendar: "कैलेंडर",
    reset_orders: "आदेश रीसेट करें",
    asset_labels: "संपत्ति लेबल",
    asset_register: "संपत्ति रजिस्टर",
    multi_user: "मल्टी-यूज़र व्यू",
    order_reports: "आदेश रिपोर्ट",
    selected_department: "चयनित विभाग",
    location: "स्थान",
    view_requests: "अनुरोध देखें",
    new_request: "नया अनुरोध",
    repair: "मरम्मत",
    projects: "प्रोजेक्ट",
    
    // Planning
    leakage: "रिसाव",
    repairs: "मरम्मत",
    pending: "लंबित",
    approved: "अनुमोदित",
    technician_label: "तकनीशियन",
    duration: "अवधि (मिनट)",
    person_in_charge: "प्रभारी व्यक्ति",
    backup: "बैकअप",
    start_date: "शुरू तिथि",
    finish_date: "समाप्ति तिथि",
    asset_filter: "संपत्ति फ़िल्टर:",
    search: "खोजें:",
    dispatch_engineer: "इंजीनियर भेजें",
    
    // Task Entry
    new_task: "नया कार्य — मरम्मत",
    asset_code: "संपत्ति कोड",
    search_btn: "खोजें",
    asset_name: "संपत्ति का नाम",
    asset_type: "संपत्ति प्रकार",
    serial: "सीरियल",
    location_detail: "स्थान विवरण",
    urgency: "तात्कालिकता",
    urgent_repairs: "अत्यावश्यक मरम्मत",
    needed_repairs: "आवश्यक मरम्मत",
    improvements: "सुधार और प्रोजेक्ट",
    description: "विवरण",
    new_btn: "+ नया",
    confirm: "पुष्टि करें",
    delete: "हटाएं",
    task_list_title: "कार्य सूची",
    planned: "योजनाबद्ध",
    deleted: "हटाया गया",
    rework: "पुनर्कार्य",
    unplanned: "अनियोजित",
    
    // Approvals
    pending_approvals: "लंबित अनुमोदन",
    review_subtitle: "रखरखाव अनुरोधों की समीक्षा और अनुमोदन करें",
    export: "निर्यात",
    date_requested: "अनुरोध तिथि",
    due_date: "नियत तिथि",
    status: "स्थिति",
    action: "कार्रवाई",
    
    // WhatsApp
    scenario_presets: "परिदृश्य प्रीसेट",
    clear: "साफ़ करें",
    system_logs: "सिस्टम लॉग",
    type_message: "संदेश टाइप करें...",
    
    // Technician
    my_job_queue: "मेरी कार्य पंक्ति",
    select_work_orders: "अपनी प्रगति अपडेट करने के लिए कार्य आदेश चुनें।",
    work_order: "कार्य आदेश",
    scheduled: "निर्धारित",
    
    // API
    endpoint_details: "एंडपॉइंट विवरण",
    select_endpoint: "ऊपर ड्रॉपडाउन से एंडपॉइंट चुनें।",
    send: "भेजें",
    response: "प्रतिक्रिया",
    
    // Database
    tables: "तालिका",
    field_name: "फ़ील्ड नाम",
    data_type: "डेटा प्रकार",
    key: "कुंजी",
    relationships: "संबंध",
    
    // Docs
    solution_design: "1. समाधान डिज़ाइन",
    decision_logic: "2. निर्णय तर्क",
    data_model_doc: "3. डेटा मॉडल",
    business_impact: "4. व्यापार प्रभाव"
  }
};

// Current language
let currentLang = localStorage.getItem('nita_lang') || 'en';

// Translation function
function t(key) {
  return translations[currentLang]?.[key] || translations.en[key] || key;
}

// Apply translations to all elements with data-i18n attribute
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });
  
  // Update placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });
  
  // Update language switcher active state
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}

// Switch language
function switchLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('nita_lang', lang);
  applyTranslations();
}

// Initialize language switcher
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => switchLanguage(btn.dataset.lang));
  });
  applyTranslations();
});