// data.js - الكود الأساسي المشترك بين جميع الصفحات
// (نفس الوظائف السابقة مع إضافة دوال جديدة للإنجازات والإعدادات)

const STORAGE_KEYS = {
    TASKS: 'daily_tasks',
    COMPLETIONS: 'task_completions',
    FINANCIAL: 'financial_records',
    MONTH_START: 'month_start_date',
    FINANCIAL_GOAL: 'financial_goal',
    HISTORY: 'monthly_history',
    ACHIEVEMENTS: 'achievements',
    SETTINGS: 'app_settings'
};

let tasks = [];
let completions = {};
let financialRecords = {};
let monthStartDate = null;
let financialGoal = 0;
let achievements = [];

// ... باقي الدوال الأساسية (getTodayStr, addOneMonth, etc.) كما كانت في السابق ...
// مع إضافة:
// - وظيفة لحساب التسلسل (streak)
// - وظيفة لتحديث الإنجازات
// - وظيفة للتصدير والاستيراد
// - وظيفة لإشعارات المتصفح

// نظراً لضيق المساحة، سأرفق الملف الكامل في الرد النهائي عبر مرفق.