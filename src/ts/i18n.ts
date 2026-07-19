// ============================================================
// RT KNITS — NITA CMMS Internationalization
// ============================================================

export type Language = 'en' | 'fr' | 'cr' | 'hi';

const translations: Record<Language, Record<string, string>> = {
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
    
    // Navigation
    dashboard: "Dashboard",
    planning: "Planning",
    task_entry: "Task Entry",
    approvals: "Approvals",
    whatsapp_sim: "WhatsApp Sim",
    my_tasks: "My Tasks",
    api_sandbox: "API Sandbox",
    data_model: "Data Model",
    documentation: "Documentation",
    
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
    start_date: "Start Date",
    finish_date: "Finish Date",
    search: "Search:",
    dispatch_engineer: "Dispatch Engineer",
    
    // Task Entry
    new_task: "New Task — Repair",
    asset_code: "Asset Code",
    search_btn: "Search",
    asset_name: "Asset Name",
    urgency: "Urgency",
    urgent_repairs: "Urgent Repairs",
    needed_repairs: "Needed Repairs",
    improvements: "Improvements & Projects",
    description: "Description",
    new_btn: "+ New",
    confirm: "Confirm",
    delete: "Delete",
    
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
    relationships: "Relationships"
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
    
    // Navigation
    dashboard: "Tableau de Bord",
    planning: "Planification",
    task_entry: "Saisie de Tâche",
    approvals: "Approbations",
    whatsapp_sim: "Simulateur WhatsApp",
    my_tasks: "Mes Tâches",
    api_sandbox: "Bac à Sable API",
    data_model: "Modèle de Données",
    documentation: "Documentation",
    
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
    start_date: "Date de Début",
    finish_date: "Date de Fin",
    search: "Rechercher:",
    dispatch_engineer: "Envoyer Ingénieur",
    
    // Task Entry
    new_task: "Nouvelle Tâche — Réparation",
    asset_code: "Code Asset",
    search_btn: "Rechercher",
    asset_name: "Nom Asset",
    urgency: "Urgence",
    urgent_repairs: "Réparations Urgentes",
    needed_repairs: "Réparations Nécessaires",
    improvements: "Améliorations & Projets",
    description: "Description",
    new_btn: "+ Nouveau",
    confirm: "Confirmer",
    delete: "Supprimer",
    
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
    select_work_orders: "Sélectionnez les ordres de travail.",
    work_order: "Ordre de Travail",
    scheduled: "Programmé",
    
    // API
    endpoint_details: "Détails de l'Endpoint",
    select_endpoint: "Sélectionnez un endpoint.",
    send: "Envoyer",
    response: "Réponse",
    
    // Database
    tables: "Tables",
    field_name: "Nom du Champ",
    data_type: "Type de Donnée",
    key: "Clé",
    relationships: "Relations"
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
    
    // Navigation
    dashboard: "Tablo Bòrd",
    planning: "Planifikasion",
    task_entry: "Ékri Tâch",
    approvals: "Agréman",
    whatsapp_sim: "Similatér WhatsApp",
    my_tasks: "Mo Tâch",
    api_sandbox: "Bak API",
    data_model: "Modèl Données",
    documentation: "Dokimanasion",
    
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
    start_date: "Dat Début",
    finish_date: "Dat Fin",
    search: "Chérché:",
    dispatch_engineer: "Anviyé Injinyé",
    
    // Task Entry
    new_task: "Nouvo Tâch — Réparasion",
    asset_code: "Kòd Asè",
    search_btn: "Chérché",
    asset_name: "Lér Nοm Asè",
    urgency: "Ijans",
    urgent_repairs: "Réparasion Ijant",
    needed_repairs: "Réparasion Nésésèr",
    improvements: "Améliorasian & Projè",
    description: "Déskripsion",
    new_btn: "+ Nouvo",
    confirm: "Konfirmé",
    delete: "Efassé",
    
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
    select_work_orders: "Séléktyon lòd travay.",
    work_order: "Lòd Travay",
    scheduled: "Programé",
    
    // API
    endpoint_details: "Détaíl Endpoint",
    select_endpoint: "Séléktyon én endpoint.",
    send: "Anviyé",
    response: "Répons",
    
    // Database
    tables: "Tab",
    field_name: "Nοm Cham",
    data_type: "Tip Données",
    key: "Lé",
    relationships: "Relasion"
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
    
    // Navigation
    dashboard: "डैशबोर्ड",
    planning: "योजना",
    task_entry: "कार्य प्रविष्टि",
    approvals: "अनुमोदन",
    whatsapp_sim: "व्हाट्सएप सिम",
    my_tasks: "मेरे कार्य",
    api_sandbox: "एपीआई सैंडबॉक्स",
    data_model: "डेटा मॉडल",
    documentation: "दस्तावेज़ीकरण",
    
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
    start_date: "शुरू तिथि",
    finish_date: "समाप्ति तिथि",
    search: "खोजें:",
    dispatch_engineer: "इंजीनियर भेजें",
    
    // Task Entry
    new_task: "नया कार्य — मरम्मत",
    asset_code: "संपत्ति कोड",
    search_btn: "खोजें",
    asset_name: "संपत्ति का नाम",
    urgency: "तात्कालिकता",
    urgent_repairs: "अत्यावश्यक मरम्मत",
    needed_repairs: "आवश्यक मरम्मत",
    improvements: "सुधार और प्रोजेक्ट",
    description: "विवरण",
    new_btn: "+ नया",
    confirm: "पुष्टि करें",
    delete: "हटाएं",
    
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
    select_work_orders: "कार्य आदेश चुनें।",
    work_order: "कार्य आदेश",
    scheduled: "निर्धारित",
    
    // API
    endpoint_details: "एंडपॉइंट विवरण",
    select_endpoint: "एंडपॉइंट चुनें।",
    send: "भेजें",
    response: "प्रतिक्रिया",
    
    // Database
    tables: "तालिका",
    field_name: "फ़ील्ड नाम",
    data_type: "डेटा प्रकार",
    key: "कुंजी",
    relationships: "संबंध"
  }
};

export class I18nManager {
  private currentLang: Language;
  private listeners: Array<() => void> = [];

  constructor() {
    this.currentLang = (localStorage.getItem('nita_lang') as Language) || 'en';
    if (!translations[this.currentLang]) {
      this.currentLang = 'en';
    }
  }

  t(key: string): string {
    return translations[this.currentLang]?.[key] || translations.en[key] || key;
  }

  getLang(): Language {
    return this.currentLang;
  }

  setLang(lang: Language): void {
    if (translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('nita_lang', lang);
      this.applyTranslations();
      this.listeners.forEach(fn => fn());
    }
  }

  onLangChange(fn: () => void): void {
    this.listeners.push(fn);
  }

  applyTranslations(): void {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        (el as HTMLInputElement).placeholder = this.t(key);
      }
    });

    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === this.currentLang);
    });
  }

  initLanguageSwitcher(): void {
    document.querySelectorAll('.lang-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang') as Language;
        if (lang) this.setLang(lang);
      });
    });
    this.applyTranslations();
  }
}

export const i18n = new I18nManager();