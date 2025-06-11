import React, { useState, useEffect, useRef, useCallback } from 'react';
// Firebase imports are removed as per "internal only" data storage request, using localStorage instead.
// import { initializeApp } from 'firebase/app';
// import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
// import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, orderBy, getDocs } from 'firebase/firestore';


// Translations configuration
const resources = {
    ar: {
        translation: {
            appName: "تذكير الأدوية",
            addReminderTitle: "أضف تذكير دواء جديد",
            medicineNamePlaceholder: "اسم الدواء (مثال: فيتامين د)",
            addReminderButton: "أضف تذكير",
            // userIdLabel: "معرف المستخدم الخاص بك (للتحديد):", // Removed as userId is not relevant with localStorage
            notificationPermissionText: "لتمكين التنبيهات، يرجى السماح بالإشعارات في متصفحك.",
            allowNotificationsButton: "السماح بالإشعارات",
            myRemindersTitle: "تذكيراتي النشطة",
            noRemindersText: "لا توجد تذكيرات نشطة حالياً. أضف تذكيرك الأول!",
            reminderTime: "الوقت:",
            markTakenButton: "تم تناوله",
            deleteButton: "حذف",
            alertFillFields: "الرجاء إدخال اسم الدواء والوقت.",
            confirmDelete: "هل أنت متأكد أنك تريد حذف هذا التذكير؟ سيتم نقله إلى الأدوية السابقة.",
            markedTaken: "تم تسجيل الدواء كـ 'تم تناوله'.",
            loadingApp: "جاري تحميل التطبيق...",
            notificationTitle: "تذكير: {{name}}",
            notificationBody: "حان وقت تناول دواء {{name}} في {{time}}.",
            browserNoSupport: "هذا المتصفح لا يدعم إشعارات سطح المكتب.",
            previousMedicationsTitle: "الأدوية السابقة",
            noPreviousMedications: "لا توجد أدوية سابقة.",
            medicationHistoryTitle: "سجل الأدوية المتناولة",
            noMedicationHistory: "لا يوجد سجل لأدوية متناولة بعد.",
            takenAt: "تم تناوله في:",
            restoreButton: "استعادة"
        }
    },
    fr: {
        translation: {
            appName: "Rappels de Médicaments",
            addReminderTitle: "Ajouter un nouveau rappel de médicament",
            medicineNamePlaceholder: "Nom du médicament (ex: Vitamine D)",
            addReminderButton: "Ajouter un rappel",
            // userIdLabel: "Votre ID utilisateur (pour identification):", // Removed
            notificationPermissionText: "Pour activer les alertes, veuillez autoriser les notifications dans votre navigateur.",
            allowNotificationsButton: "Autoriser les notifications",
            myRemindersTitle: "Mes Rappels Actifs",
            noRemindersText: "Aucun rappel actif pour l'instant. Ajoutez votre premier rappel !",
            reminderTime: "Heure:",
            markTakenButton: "Pris",
            deleteButton: "Supprimer",
            alertFillFields: "Veuillez entrer le nom du médicament et l'heure.",
            confirmDelete: "Êtes-vous sûr de vouloir supprimer ce rappel ? Il sera déplacé vers les médicaments précédents.",
            markedTaken: "Médicament marqué comme 'pris'.",
            loadingApp: "Chargement de l'application...",
            notificationTitle: "Rappel: {{name}}",
            notificationBody: "Il est temps de prendre le médicament {{name}} à {{time}}.",
            browserNoSupport: "Ce navigateur ne prend pas en charge les notifications de bureau.",
            previousMedicationsTitle: "Médicaments Précédents",
            noPreviousMedications: "Aucun médicament précédent.",
            medicationHistoryTitle: "Historique des médicaments pris",
            noMedicationHistory: "Aucun historique de médicaments pris pour le moment.",
            takenAt: "Pris à:",
            restoreButton: "Restaurer"
        }
    }
};

// Main App Component
const App = () => {
    // State variables
    const [activeReminders, setActiveReminders] = useState([]); // Active medication reminders
    const [archivedReminders, setArchivedReminders] = useState([]); // Reminders marked as 'deleted'
    const [takenHistory, setTakenHistory] = useState([]); // History of taken medications
    const [newReminderName, setNewReminderName] = useState(''); // Input for new reminder name
    const [newReminderTime, setNewReminderTime] = useState(''); // Input for new reminder time (HH:MM)
    const [isAppReady, setIsAppReady] = useState(false); // Flag for app readiness
    const [notificationPermission, setNotificationPermission] = useState('default'); // Notification permission status
    const notificationIntervalRef = useRef(null); // Ref to hold the notification interval ID

    // --- Language Management ---
    const [currentLanguage, setCurrentLanguage] = useState('ar'); // Default to Arabic

    // Simple translation function
    const t = (key, interpolations = {}) => {
        let text = resources[currentLanguage]?.translation[key] || key;
        for (const [placeholder, value] of Object.entries(interpolations)) {
            text = text.replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'), value);
        }
        return text;
    };

    // Effect to set document direction based on current language
    useEffect(() => {
        document.documentElement.setAttribute('dir', currentLanguage === 'ar' ? 'rtl' : 'ltr');
    }, [currentLanguage]);

    const changeLanguage = (lng) => {
        setCurrentLanguage(lng);
    };

    // --- Local Storage Management ---
    // Load data from localStorage on initial render
    useEffect(() => {
        try {
            const storedActiveReminders = localStorage.getItem('medicationReminders_active');
            const storedArchivedReminders = localStorage.getItem('medicationReminders_archived');
            const storedTakenHistory = localStorage.getItem('medicationReminders_takenHistory');

            if (storedActiveReminders) {
                setActiveReminders(JSON.parse(storedActiveReminders));
            }
            if (storedArchivedReminders) {
                setArchivedReminders(JSON.parse(storedArchivedReminders));
            }
            if (storedTakenHistory) {
                setTakenHistory(JSON.parse(storedTakenHistory));
            }
        } catch (error) {
            console.error("Failed to load data from localStorage:", error);
        } finally {
            setIsAppReady(true); // Mark app as ready after attempting to load data
        }
    }, []);

    // Save activeReminders to localStorage whenever it changes
    useEffect(() => {
        if (isAppReady) { // Only save after initial load
            localStorage.setItem('medicationReminders_active', JSON.stringify(activeReminders));
        }
    }, [activeReminders, isAppReady]);

    // Save archivedReminders to localStorage whenever it changes
    useEffect(() => {
        if (isAppReady) { // Only save after initial load
            localStorage.setItem('medicationReminders_archived', JSON.stringify(archivedReminders));
        }
    }, [archivedReminders, isAppReady]);

    // Save takenHistory to localStorage whenever it changes
    useEffect(() => {
        if (isAppReady) { // Only save after initial load
            localStorage.setItem('medicationReminders_takenHistory', JSON.stringify(takenHistory));
        }
    }, [takenHistory, isAppReady]);


    // --- Notification Permissions ---
    const requestNotificationPermission = async () => {
        if (!('Notification' in window)) {
            alert(t('browserNoSupport'));
            return;
        }
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
    };

    // --- Schedule Notifications ---
    // useCallback to memoize the function and prevent unnecessary re-creations
    const scheduleNotifications = useCallback(() => {
        if (notificationIntervalRef.current) {
            clearInterval(notificationIntervalRef.current);
        }

        if (notificationPermission === 'granted' && isAppReady && activeReminders.length > 0) {
            notificationIntervalRef.current = setInterval(() => {
                const now = new Date();
                const currentHour = now.getHours();
                const currentMinute = now.getMinutes();

                activeReminders.forEach(reminder => { // Only check active reminders
                    if (reminder.time) {
                        const [reminderHour, reminderMinute] = reminder.time.split(':').map(Number);

                        if (
                            reminderHour === currentHour &&
                            currentMinute === reminderMinute
                        ) {
                            // Basic check to prevent rapid re-notification within the same minute
                            // This uses localStorage for simplicity, but a more robust PWA would use a Service Worker for persistent alarms
                            const lastNotifiedKey = `lastNotified_${reminder.id}_${now.toDateString()}`; // Key per day
                            const lastNotified = localStorage.getItem(lastNotifiedKey);

                            if (!lastNotified) { // If not notified today
                                new Notification(t('notificationTitle', { name: reminder.name }), {
                                    body: t('notificationBody', { name: reminder.name, time: reminder.time }),
                                    icon: 'https://placehold.co/64x64/00BFFF/FFFFFF?text=💊'
                                });
                                localStorage.setItem(lastNotifiedKey, 'true'); // Mark as notified for today
                            }
                        }
                    }
                });
            }, 60 * 1000); // Check every minute

            return () => clearInterval(notificationIntervalRef.current);
        }
    }, [activeReminders, notificationPermission, isAppReady, t]);

    // Effect to call scheduleNotifications when dependencies change
    useEffect(() => {
        scheduleNotifications();
        // Cleanup on unmount or re-render
        return () => {
            if (notificationIntervalRef.current) {
                clearInterval(notificationIntervalRef.current);
            }
        };
    }, [scheduleNotifications]);


    // --- Form Handlers ---
    const handleAddReminder = () => {
        if (newReminderName.trim() === '' || newReminderTime.trim() === '') {
            alert(t('alertFillFields'));
            return;
        }

        const newReminder = {
            id: Date.now().toString(), // Simple unique ID
            name: newReminderName,
            time: newReminderTime,
            createdAt: new Date().toISOString(),
        };

        const updatedReminders = [...activeReminders, newReminder].sort((a, b) => a.time.localeCompare(b.time));
        setActiveReminders(updatedReminders);
        setNewReminderName('');
        setNewReminderTime('');
    };

    const handleDeleteReminder = (id) => {
        if (window.confirm(t('confirmDelete'))) {
            const reminderToDelete = activeReminders.find(r => r.id === id);
            if (reminderToDelete) {
                // Remove from active reminders
                setActiveReminders(prev => prev.filter(r => r.id !== id));

                // Add to archived reminders with a deletedAt timestamp
                const updatedArchivedReminders = [...archivedReminders, { ...reminderToDelete, deletedAt: new Date().toISOString() }];
                setArchivedReminders(updatedArchivedReminders);
            }
        }
    };

    const handleMarkTaken = (id) => {
        const reminder = activeReminders.find(r => r.id === id);
        if (reminder) {
            const now = new Date();
            const takenEntry = {
                reminderId: reminder.id,
                name: reminder.name,
                time: reminder.time,
                takenAt: now.toISOString(),
                takenDateFormatted: now.toLocaleDateString(currentLanguage === 'ar' ? 'ar-EG' : 'fr-FR', {
                    year: 'numeric', month: 'long', day: 'numeric'
                }),
                takenTimeFormatted: now.toLocaleTimeString(currentLanguage === 'ar' ? 'ar-EG' : 'fr-FR', {
                    hour: '2-digit', minute: '2-digit', hour12: false
                })
            };
            setTakenHistory(prev => [takenEntry, ...prev]); // Add to beginning for newest first
            alert(t('markedTaken'));
        }
    };

    const handleRestoreReminder = (id) => {
        const reminderToRestore = archivedReminders.find(r => r.id === id);
        if (reminderToRestore) {
            // Remove from archived reminders
            setArchivedReminders(prev => prev.filter(r => r.id !== id));

            // Add back to active reminders (remove deletedAt property)
            const { deletedAt, ...restoredReminder } = reminderToRestore;
            const updatedReminders = [...activeReminders, restoredReminder].sort((a, b) => a.time.localeCompare(b.time));
            setActiveReminders(updatedReminders);
        }
    };


    // --- Render UI ---
    if (!isAppReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100 font-sans p-4">
                <p className="text-lg text-gray-700">{t('loadingApp')}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-100 to-indigo-200 p-4 sm:p-6 font-inter text-gray-800">
            <style>
                {`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body {
                    font-family: 'Inter', sans-serif;
                }
                .scroll-container::-webkit-scrollbar {
                    width: 8px;
                }
                .scroll-container::-webkit-scrollbar-track {
                    background: #e0e0e0;
                    border-radius: 10px;
                }
                .scroll-container::-webkit-scrollbar-thumb {
                    background: #9ca3af;
                    border-radius: 10px;
                }
                .scroll-container::-webkit-scrollbar-thumb:hover {
                    background: #6b7280;
                }
                `}
            </style>
            <div dir={currentLanguage === 'ar' ? 'rtl' : 'ltr'} className="max-w-4xl mx-auto bg-white rounded-xl shadow-2xl p-6 sm:p-8 space-y-8">
                {/* Language Selector */}
                <div className="flex justify-end gap-2 mb-4">
                    <button
                        onClick={() => changeLanguage('ar')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold ${currentLanguage === 'ar' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        العربية
                    </button>
                    <button
                        onClick={() => changeLanguage('fr')}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold ${currentLanguage === 'fr' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                        Français
                    </button>
                </div>

                {/* Header */}
                <h1 className="text-4xl sm:text-5xl font-extrabold text-center text-indigo-700 mb-6 drop-shadow-md">
                    {t('appName')}
                </h1>

                {/* No User ID Display as data is local */}

                {/* Add New Reminder Section */}
                <div className="bg-indigo-50 p-5 rounded-lg shadow-inner border border-indigo-200">
                    <h2 className="text-2xl font-semibold text-indigo-600 mb-4">{t('addReminderTitle')}</h2>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <input
                            type="text"
                            placeholder={t('medicineNamePlaceholder')}
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition duration-200"
                            value={newReminderName}
                            onChange={(e) => setNewReminderName(e.target.value)}
                            aria-label={t('medicineNamePlaceholder')}
                        />
                        <input
                            type="time"
                            className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-400 focus:border-transparent outline-none transition duration-200"
                            value={newReminderTime}
                            onChange={(e) => setNewReminderTime(e.target.value)}
                            aria-label={t('reminderTime')}
                        />
                        <button
                            onClick={handleAddReminder}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition duration-300 transform hover:scale-105"
                            aria-label={t('addReminderButton')}
                        >
                            {t('addReminderButton')}
                        </button>
                    </div>
                </div>

                {/* Notification Permission Section */}
                {notificationPermission !== 'granted' && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 text-center shadow-sm">
                        <p className="text-yellow-800 mb-3">{t('notificationPermissionText')}</p>
                        <button
                            onClick={requestNotificationPermission}
                            className="bg-yellow-500 text-white px-5 py-2 rounded-lg shadow hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-offset-2 transition duration-300"
                            aria-label={t('allowNotificationsButton')}
                        >
                            {t('allowNotificationsButton')}
                        </button>
                    </div>
                )}

                {/* Active Reminders List */}
                <div className="space-y-4">
                    <h2 className="text-2xl font-semibold text-indigo-600">{t('myRemindersTitle')}</h2>
                    {activeReminders.length === 0 ? (
                        <p className="text-center text-gray-500 p-4 bg-gray-50 rounded-lg">{t('noRemindersText')}</p>
                    ) : (
                        <div className="max-h-96 overflow-y-auto pr-2 scroll-container">
                            {activeReminders.map((reminder) => (
                                <div
                                    key={reminder.id}
                                    className="flex items-center justify-between bg-white p-4 rounded-lg shadow-md border border-gray-200 mb-3 transition duration-200 ease-in-out transform hover:scale-[1.01]"
                                >
                                    <div>
                                        <p className="text-lg font-medium text-gray-900">{reminder.name}</p>
                                        <p className="text-sm text-gray-600">{t('reminderTime')} {reminder.time}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleMarkTaken(reminder.id)}
                                            className="bg-green-500 text-white px-3 py-2 rounded-md text-sm shadow hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 transition duration-300"
                                            aria-label={`${t('markTakenButton')} ${reminder.name}`}
                                        >
                                            {t('markTakenButton')}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteReminder(reminder.id)}
                                            className="bg-red-500 text-white px-3 py-2 rounded-md text-sm shadow hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-400 transition duration-300"
                                            aria-label={`${t('deleteButton')} ${reminder.name}`}
                                        >
                                            {t('deleteButton')}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Previous Medications (Archived) List */}
                <div className="space-y-4 mt-8">
                    <h2 className="text-2xl font-semibold text-indigo-600">{t('previousMedicationsTitle')}</h2>
                    {archivedReminders.length === 0 ? (
                        <p className="text-center text-gray-500 p-4 bg-gray-50 rounded-lg">{t('noPreviousMedications')}</p>
                    ) : (
                        <div className="max-h-60 overflow-y-auto pr-2 scroll-container">
                            {archivedReminders.map((reminder) => (
                                <div
                                    key={reminder.id}
                                    className="flex items-center justify-between bg-gray-100 p-4 rounded-lg shadow-sm border border-gray-300 mb-3 opacity-70 transition duration-200 ease-in-out"
                                >
                                    <div>
                                        <p className="text-lg font-medium text-gray-700 line-through">{reminder.name}</p>
                                        <p className="text-sm text-gray-500">{t('reminderTime')} {reminder.time}</p>
                                    </div>
                                    <button
                                        onClick={() => handleRestoreReminder(reminder.id)}
                                        className="bg-blue-500 text-white px-3 py-2 rounded-md text-sm shadow hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition duration-300"
                                        aria-label={`${t('restoreButton')} ${reminder.name}`}
                                    >
                                        {t('restoreButton')}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Medication History List */}
                <div className="space-y-4 mt-8">
                    <h2 className="text-2xl font-semibold text-indigo-600">{t('medicationHistoryTitle')}</h2>
                    {takenHistory.length === 0 ? (
                        <p className="text-center text-gray-500 p-4 bg-gray-50 rounded-lg">{t('noMedicationHistory')}</p>
                    ) : (
                        <div className="max-h-60 overflow-y-auto pr-2 scroll-container">
                            {takenHistory.map((entry, index) => (
                                <div
                                    key={entry.takenAt + index} // Use takenAt + index for unique key
                                    className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-3"
                                >
                                    <div>
                                        <p className="text-lg font-medium text-gray-900">{entry.name}</p>
                                        <p className="text-sm text-gray-600">
                                            {t('takenAt')} {entry.takenDateFormatted} {entry.takenTimeFormatted}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default App;
