// ============================================================
// NITA i18n — Working Language System
// ============================================================

window.NITA_I18N = {
  currentLang: localStorage.getItem('nita_lang') || 'en',

  translations: {
    en: {
      // Auth
      login_subtitle: "RT Knits Maintenance Portal",
      sign_in: "Sign In", sign_up: "Sign Up",
      phone_label: "Phone Number", pin_label: "PIN",
      phone_placeholder: "+230 5XXX XXXX", pin_placeholder: "Enter PIN (Default: 1234)",
      create_account: "Create Account", full_name: "Full Name",
      role_label: "Role", department: "Department",
      select_department: "Select Department", trade: "Trade",
      create_pin: "Create PIN (4-6 digits)",
      operator: "Operator", technician: "Technician", coordinator: "Coordinator",
      // Nav
      nav_dashboard: "Dashboard", nav_planning: "Planning", nav_tasks: "Task Entry",
      nav_approvals: "Approvals", nav_simulator: "WhatsApp Sim",
      nav_my_tasks: "My Tasks", nav_api: "API Sandbox",
      nav_data: "Data Model", nav_docs: "Documentation",
      // Dashboard
      dash_title: "Coordinator Dashboard",
      dash_departments: "Departments", dash_approvals: "Pending Approvals",
      dash_immediate: "Immediate Planning", dash_planned: "Planned",
      dash_technicians: "Technicians", dash_work_orders: "Work Orders",
      dash_reports: "Reports", dash_special: "Special Task",
      dash_tech_status: "Tech Status", dash_task_list: "Task List",
      dash_preventive: "Preventive", dash_calendar: "Calendar",
      dash_asset_register: "Asset Register", dash_reset: "Reset Orders",
      dash_selected_dept: "Selected Department", dash_location: "Location",
      dash_view_requests: "View Requests", dash_new_request: "New Request",
      dash_repair: "Repair", dash_projects: "Projects & Improvements",
      // Planning
      plan_leakage: "Leakage Requests", plan_repairs: "Planning Repairs",
      plan_pending: "Engineer Pending", plan_approved: "Engineer Approved",
      plan_technician: "Technician", plan_duration: "Duration (min)",
      plan_charge: "Person in Charge", plan_backup: "Backup",
      plan_start: "Start Date", plan_finish: "Finish Date",
      plan_search: "Search:", plan_dispatch: "Dispatch Engineer",
      // Task Entry
      task_new: "New Task", task_asset_code: "Asset Code",
      task_search: "Search", task_asset_name: "Asset Name",
      task_type: "Asset Type", task_serial: "Serial",
      task_dept: "Department", task_location: "Location",
      task_urgency: "Urgency", task_description: "Description",
      task_urgent: "Urgent Repairs", task_needed: "Needed Repairs",
      task_improvements: "Improvements & Projects",
      task_new_btn: "+ New", task_confirm: "Confirm", task_delete: "Delete",
      task_list: "Task List", task_planned: "Planned",
      task_deleted: "Deleted", task_rework: "Rework", task_unplanned: "Unplanned",
      // Approvals
      approve_title: "Pending Approvals",
      approve_subtitle: "Review and approve maintenance requests",
      approve_export: "Print Out", approve_date: "Date Requested",
      approve_due: "Due Date", approve_status: "Status", approve_action: "Action",
      approve_yes: "Approved", approve_no: "Not Approved",
      // WhatsApp
      wa_presets: "Scenario Quick Presets",
      wa_logs: "NITA System Logs & Reasoning",
      wa_clear: "Clear Logs", wa_placeholder: "Type a message...",
      // Technician
      tech_queue: "My Dispatched Job Queue",
      tech_desc: "Select active work orders to update your progress.",
      tech_work_order: "Work Order ID", tech_asset: "Asset",
      tech_scheduled: "Scheduled", tech_action: "Lifecycle Action",
      // API
      api_title: "API Endpoint Tester",
      api_desc: "Select an endpoint from the top dropdown to view details.",
      api_send: "Send Request", api_response: "JSON Response",
      // Database
      db_tables: "Tables", db_field: "Field Name",
      db_type: "Data Type", db_key: "Key / Constraint",
      db_desc: "Description", db_relations: "Relationships",
      // Docs
      doc_solution: "1. Solution Design", doc_logic: "2. Decision Logic",
      doc_model: "3. Data Model Analysis", doc_impact: "4. Business Impact",
      // Misc
      logout: "Log Out", host: "RT Knits (Mauritius)", sla: "SLA Target: 99.8%",
      server: "Maintenance Database", save: "Save"
    },

    fr: {
      login_subtitle: "Portail de Maintenance RT Knits",
      sign_in: "Connexion", sign_up: "Inscription",
      phone_label: "Numéro de Téléphone", pin_label: "PIN",
      phone_placeholder: "+230 5XXX XXXX", pin_placeholder: "Entrez votre PIN (Défaut: 1234)",
      create_account: "Créer un Compte", full_name: "Nom Complet",
      role_label: "Rôle", department: "Département",
      select_department: "Sélectionner un Département", trade: "Métier",
      create_pin: "Créer un PIN (4-6 chiffres)",
      operator: "Opérateur", technician: "Technicien", coordinator: "Coordinateur",
      nav_dashboard: "Tableau de Bord", nav_planning: "Planification",
      nav_tasks: "Saisie de Tâche", nav_approvals: "Approbations",
      nav_simulator: "Simulateur WhatsApp", nav_my_tasks: "Mes Tâches",
      nav_api: "Bac à Sable API", nav_data: "Modèle de Données",
      nav_docs: "Documentation",
      dash_title: "Tableau de Bord Coordinateur",
      dash_departments: "Départements", dash_approvals: "Approbations en Attente",
      dash_immediate: "Planification Immédiate", dash_planned: "Planifié",
      dash_technicians: "Techniciens", dash_work_orders: "Ordres de Travail",
      dash_reports: "Rapports", dash_special: "Tâche Spéciale",
      dash_tech_status: "État Technique", dash_task_list: "Liste des Tâches",
      dash_preventive: "Préventif", dash_calendar: "Calendrier",
      dash_asset_register: "Registre des Assets", dash_reset: "Réinitialiser",
      dash_selected_dept: "Département Sélectionné", dash_location: "Emplacement",
      dash_view_requests: "Voir les Demandes", dash_new_request: "Nouvelle Demande",
      dash_repair: "Réparation", dash_projects: "Projets & Améliorations",
      plan_leakage: "Demandes de Fuites", plan_repairs: "Planification Réparations",
      plan_pending: "Ingénieur en Attente", plan_approved: "Ingénieur Approuvé",
      plan_technician: "Technicien", plan_duration: "Durée (min)",
      plan_charge: "Responsable", plan_backup: "Suppléant",
      plan_start: "Date de Début", plan_finish: "Date de Fin",
      plan_search: "Rechercher:", plan_dispatch: "Envoyer Ingénieur",
      task_new: "Nouvelle Tâche", task_asset_code: "Code Asset",
      task_search: "Rechercher", task_asset_name: "Nom Asset",
      task_type: "Type Asset", task_serial: "Série",
      task_dept: "Département", task_location: "Emplacement",
      task_urgency: "Urgence", task_description: "Description",
      task_urgent: "Réparations Urgentes", task_needed: "Réparations Nécessaires",
      task_improvements: "Améliorations & Projets",
      task_new_btn: "+ Nouveau", task_confirm: "Confirmer", task_delete: "Supprimer",
      task_list: "Liste des Tâches", task_planned: "Planifié",
      task_deleted: "Supprimé", task_rework: "Retravail", task_unplanned: "Non Planifié",
      approve_title: "Approbations en Attente",
      approve_subtitle: "Examiner et approuver les demandes de maintenance",
      approve_export: "Imprimer", approve_date: "Date Demandée",
      approve_due: "Date d'Échéance", approve_status: "Statut", approve_action: "Action",
      approve_yes: "Approuvé", approve_no: "Rejeté",
      wa_presets: "Préréglages Scénarios",
      wa_logs: "Journaux Système NITA", wa_clear: "Effacer", wa_placeholder: "Tapez un message...",
      tech_queue: "Ma File d'Attente",
      tech_desc: "Sélectionnez les ordres de travail.",
      tech_work_order: "Ordre de Travail", tech_asset: "Asset",
      tech_scheduled: "Programmé", tech_action: "Action",
      api_title: "Testeur d'Endpoint API",
      api_desc: "Sélectionnez un endpoint ci-dessus.",
      api_send: "Envoyer", api_response: "Réponse JSON",
      db_tables: "Tables", db_field: "Nom du Champ",
      db_type: "Type de Donnée", db_key: "Clé",
      db_desc: "Description", db_relations: "Relations",
      doc_solution: "1. Conception Solution", doc_logic: "2. Logique Décisionnelle",
      doc_model: "3. Modèle de Données", doc_impact: "4. Impact Business",
      logout: "Déconnexion", host: "RT Knits (Île Maurice)", sla: "SLA: 99.8%",
      server: "Base de Données", save: "Enregistrer"
    },

    cr: {
      login_subtitle: "Laport Maintenance RT Knits",
      sign_in: "Konekte", sign_up: "Enskri",
      phone_label: "Numéro Téléfon", pin_label: "PIN",
      phone_placeholder: "+230 5XXX XXXX", pin_placeholder: "Ékrir PIN (Par défaut: 1234)",
      create_account: "Fér Komt", full_name: "Lér Nοm",
      role_label: "Zonn", department: "Départeman",
      select_department: "Séléktyon én Départeman", trade: "Métier",
      create_pin: "Fér PIN (4-6 chiffre)",
      operator: "Operatér", technician: "Tésinisyen", coordinator: "Koordinator",
      nav_dashboard: "Tablo Bòrd", nav_planning: "Planifikasion",
      nav_tasks: "Ékri Tâch", nav_approvals: "Agréman",
      nav_simulator: "Similatér WhatsApp", nav_my_tasks: "Mo Tâch",
      nav_api: "Bak API", nav_data: "Modèl Données",
      nav_docs: "Dokimanasion",
      dash_title: "Tablo Bòrd Koordinator",
      dash_departments: "Départeman", dash_approvals: "Agréman An Atandan",
      dash_immediate: "Planifikasion Imedyat", dash_planned: "Planifié",
      dash_technicians: "Tésinisyen", dash_work_orders: "Lòd Travay",
      dash_reports: "Rapò", dash_special: "Tâch Spésyal",
      dash_tech_status: "Eta Tech", dash_task_list: "Lis Tâch",
      dash_preventive: "Préventif", dash_calendar: "Kalannrié",
      dash_asset_register: "Rejistr Asè", dash_reset: "Résè Lòd",
      dash_selected_dept: "Départeman Séléktyoné", dash_location: "Lokasion",
      dash_view_requests: "Vwar Dimann", dash_new_request: "Nouvo Dimann",
      dash_repair: "Réparasion", dash_projects: "Projè & Améliorasian",
      plan_leakage: "Dimann Fuit", plan_repairs: "Planifikasion Réparasion",
      plan_pending: "Injinyé An Atandan", plan_approved: "Injinyé Agré",
      plan_technician: "Tésinisyen", plan_duration: "Duré (min)",
      plan_charge: "Lé Réspansab", plan_backup: "Siplyan",
      plan_start: "Dat Début", plan_finish: "Dat Fin",
      plan_search: "Chérché:", plan_dispatch: "Anviyé Injinyé",
      task_new: "Nouvo Tâch", task_asset_code: "Kòd Asè",
      task_search: "Chérché", task_asset_name: "Lér Nοm Asè",
      task_type: "Tip Asè", task_serial: "Séry",
      task_dept: "Départeman", task_location: "Lokasion",
      task_urgency: "Ijans", task_description: "Déskripsion",
      task_urgent: "Réparasion Ijant", task_needed: "Réparasion Nésésèr",
      task_improvements: "Améliorasian & Projè",
      task_new_btn: "+ Nouvo", task_confirm: "Konfirmé", task_delete: "Efassé",
      task_list: "Lis Tâch", task_planned: "Planifié",
      task_deleted: "Efassé", task_rework: "Retravay", task_unplanned: "Pa Planifié",
      approve_title: "Agréman An Atandan",
      approve_subtitle: "Ékzaminé ék agrété dimann mantenans",
      approve_export: "Imprime", approve_date: "Dat Dimann",
      approve_due: "Dat Échéans", approve_status: "Sta", approve_action: "Lasion",
      approve_yes: "Agré", approve_no: "Rejété",
      wa_presets: "Préréglaz Senaryo",
      wa_logs: "Jònal Sistèm NITA", wa_clear: "Efassé", wa_placeholder: "Ékrir én mesaz...",
      tech_queue: "Mo Fil Atandan",
      tech_desc: "Séléktyon lòd travay.",
      tech_work_order: "Lòd Travay", tech_asset: "Asè",
      tech_scheduled: "Programé", tech_action: "Lasion",
      api_title: "Téstèr Endpoint API",
      api_desc: "Séléktyon én endpoint ci-dessus.",
      api_send: "Anviyé", api_response: "Répons JSON",
      db_tables: "Tab", db_field: "Nοm Cham",
      db_type: "Tip Données", db_key: "Lé",
      db_desc: "Déskripsion", db_relations: "Relasion",
      doc_solution: "1. Konsepsyon Solision", doc_logic: "2. Lozik Déskizyonèl",
      doc_model: "3. Modèl Données", doc_impact: "4. Impak Biznis",
      logout: "Dékonekte", host: "RT Knits (Moris)", sla: "SLA: 99.8%",
      server: "Baz Données", save: "Anréisté"
    },

    hi: {
      login_subtitle: "आरटी निट्स मेंटेनेंस पोर्टल",
      sign_in: "साइन इन", sign_up: "साइन अप",
      phone_label: "फ़ोन नंबर", pin_label: "पिन",
      phone_placeholder: "+230 5XXX XXXX", pin_placeholder: "पिन दर्ज करें (डिफ़ॉल्ट: 1234)",
      create_account: "खाता बनाएं", full_name: "पूरा नाम",
      role_label: "भूमिका", department: "विभाग",
      select_department: "विभाग चुनें", trade: "व्यवसाय",
      create_pin: "पिन बनाएं (4-6 अंक)",
      operator: "ऑपरेटर", technician: "तकनीशियन", coordinator: "समन्वयक",
      nav_dashboard: "डैशबोर्ड", nav_planning: "योजना",
      nav_tasks: "कार्य प्रविष्टि", nav_approvals: "अनुमोदन",
      nav_simulator: "व्हाट्सएप सिम", nav_my_tasks: "मेरे कार्य",
      nav_api: "एपीआई सैंडबॉक्स", nav_data: "डेटा मॉडल",
      nav_docs: "दस्तावेज़ीकरण",
      dash_title: "समन्वयक डैशबोर्ड",
      dash_departments: "विभाग", dash_approvals: "लंबित अनुमोदन",
      dash_immediate: "तुरंत योजना", dash_planned: "योजनाबद्ध",
      dash_technicians: "तकनीशियन", dash_work_orders: "कार्य आदेश",
      dash_reports: "रिपोर्ट", dash_special: "विशेष कार्य",
      dash_tech_status: "तकनीक स्थिति", dash_task_list: "कार्य सूची",
      dash_preventive: "निवारक", dash_calendar: "कैलेंडर",
      dash_asset_register: "संपत्ति रजिस्टर", dash_reset: "आदेश रीसेट",
      dash_selected_dept: "चयनित विभाग", dash_location: "स्थान",
      dash_view_requests: "अनुरोध देखें", dash_new_request: "नया अनुरोध",
      dash_repair: "मरम्मत", dash_projects: "प्रोजेक्ट और सुधार",
      plan_leakage: "रिसाव अनुरोध", plan_repairs: "मरम्मत योजना",
      plan_pending: "इंजीनियर लंबित", plan_approved: "इंजीनियर अनुमोदित",
      plan_technician: "तकनीशियन", plan_duration: "अवधि (मिनट)",
      plan_charge: "प्रभारी व्यक्ति", plan_backup: "बैकअप",
      plan_start: "शुरू तिथि", plan_finish: "समाप्ति तिथि",
      plan_search: "खोजें:", plan_dispatch: "इंजीनियर भेजें",
      task_new: "नया कार्य", task_asset_code: "संपत्ति कोड",
      task_search: "खोजें", task_asset_name: "संपत्ति का नाम",
      task_type: "संपत्ति प्रकार", task_serial: "सीरियल",
      task_dept: "विभाग", task_location: "स्थान",
      task_urgency: "तात्कालिकता", task_description: "विवरण",
      task_urgent: "अत्यावश्यक मरम्मत", task_needed: "आवश्यक मरम्मत",
      task_improvements: "सुधार और प्रोजेक्ट",
      task_new_btn: "+ नया", task_confirm: "पुष्टि करें", task_delete: "हटाएं",
      task_list: "कार्य सूची", task_planned: "योजनाबद्ध",
      task_deleted: "हटाया गया", task_rework: "पुनर्कार्य", task_unplanned: "अनियोजित",
      approve_title: "लंबित अनुमोदन",
      approve_subtitle: "रखरखाव अनुरोधों की समीक्षा करें",
      approve_export: "प्रिंट", approve_date: "अनुरोध तिथि",
      approve_due: "नियत तिथि", approve_status: "स्थिति", approve_action: "कार्रवाई",
      approve_yes: "अनुमोदित", approve_no: "अस्वीकृत",
      wa_presets: "परिदृश्य प्रीसेट",
      wa_logs: "सिस्टम लॉग", wa_clear: "साफ़ करें", wa_placeholder: "संदेश टाइप करें...",
      tech_queue: "मेरी कार्य पंक्ति",
      tech_desc: "कार्य आदेश चुनें।",
      tech_work_order: "कार्य आदेश", tech_asset: "संपत्ति",
      tech_scheduled: "निर्धारित", tech_action: "कार्रवाई",
      api_title: "एंडपॉइंट परीक्षक",
      api_desc: "ऊपर से एंडपॉइंट चुनें।",
      api_send: "भेजें", api_response: "प्रतिक्रिया",
      db_tables: "तालिका", db_field: "फ़ील्ड नाम",
      db_type: "डेटा प्रकार", db_key: "कुंजी",
      db_desc: "विवरण", db_relations: "संबंध",
      doc_solution: "1. समाधान डिज़ाइन", doc_logic: "2. निर्णय तर्क",
      doc_model: "3. डेटा मॉडल", doc_impact: "4. व्यापार प्रभाव",
      logout: "लॉग आउट", host: "आरटी निट्स (मॉरीशस)", sla: "एसएलए: 99.8%",
      server: "डेटाबेस", save: "सहेजें"
    }
  },

  t: function(key) {
    var lang = this.translations[this.currentLang];
    return (lang && lang[key]) || (this.translations.en && this.translations.en[key]) || key;
  },

  setLang: function(lang) {
    if (this.translations[lang]) {
      this.currentLang = lang;
      localStorage.setItem('nita_lang', lang);
      this.apply();
    }
  },

  apply: function() {
    var self = this;
    document.querySelectorAll('[data-i18n]').forEach(function(el) {
      var key = el.getAttribute('data-i18n');
      if (key) el.textContent = self.t(key);
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(function(el) {
      var key = el.getAttribute('data-i18n-ph');
      if (key) el.placeholder = self.t(key);
    });
    document.querySelectorAll('.lang-btn').forEach(function(btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === self.currentLang);
    });
  },

  init: function() {
    var self = this;
    document.querySelectorAll('.lang-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        self.setLang(btn.getAttribute('data-lang'));
      });
    });
    this.apply();
  }
};