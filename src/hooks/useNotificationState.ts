import { useState } from 'react';

export interface Notification {
    id: number;
    title: string;
    message: string;
    time: string;
    type: 'info' | 'warning' | 'success';
}

export const useNotificationState = (t: any) => {
    const [notifications, setNotifications] = useState<Notification[]>([
        { id: 1, title: t.systemReady, message: 'Ledger synchronization complete.', time: '2m ago', type: 'success' },
        { id: 2, title: t.complianceAlert, message: 'Client risk profile review due.', time: '1h ago', type: 'warning' }
    ]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [unreadCount, setUnreadCount] = useState(1);

    const addNotification = (notif: Omit<Notification, 'id' | 'time'>) => {
        setNotifications(prev => [{
            id: Date.now(),
            time: 'Just now',
            ...notif
        }, ...prev]);
        setUnreadCount(c => c + 1);
    };

    return {
        notifications,
        setNotifications,
        showNotifications,
        setShowNotifications,
        unreadCount,
        setUnreadCount,
        addNotification
    };
};
