import { useState } from 'react';
import {
  User,
  Lock,
  Bell,
  Palette,
  Loader2,
  Save,
  Eye,
  EyeOff,
  Mail,
  Phone,
  Monitor,
  Moon,
  Sun,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import api from '@/api/client';

// ---- Types ----

interface NotificationPreference {
  email_notifications: boolean;
  sms_notifications: boolean;
  push_notifications: boolean;
  in_app_notifications: boolean;
  maintenance_alerts: boolean;
  payment_reminders: boolean;
  lease_reminders: boolean;
  compliance_alerts: boolean;
  chat_notifications: boolean;
}

// ---- Component ----

export default function Settings() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<'profile' | 'password' | 'notifications' | 'display'>('profile');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  // Profile form
  const [profileForm, setProfileForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
  });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState<NotificationPreference>({
    email_notifications: true,
    sms_notifications: false,
    push_notifications: true,
    in_app_notifications: true,
    maintenance_alerts: true,
    payment_reminders: true,
    lease_reminders: true,
    compliance_alerts: true,
    chat_notifications: true,
  });

  // Theme
  const [theme, setTheme] = useState('system');

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleProfileSave = async () => {
    setSubmitting(true);
    try {
      await api.put('/auth/profile', {
        firstName: profileForm.firstName,
        lastName: profileForm.lastName,
        phone: profileForm.phone || undefined,
      });
      showSuccess('Profile updated successfully');
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError('');
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    setSubmitting(true);
    try {
      await api.put('/auth/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSuccess('Password changed successfully');
    } catch {
      setPasswordError('Failed to change password. Check your current password.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNotifSave = async () => {
    setSubmitting(true);
    try {
      await api.put('/auth/notification-preferences', notifPrefs);
      showSuccess('Notification preferences saved');
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const toggleNotif = (key: keyof NotificationPreference) => {
    setNotifPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const sections = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'password' as const, label: 'Password', icon: Lock },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'display' as const, label: 'Display', icon: Palette },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      {/* Success message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <p className="text-sm text-green-800">{success}</p>
        </div>
      )}

      <div className="flex gap-6">
        {/* Sidebar Navigation */}
        <div className="w-56 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    activeSection === section.id
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl">
          {/* Profile Section */}
          {activeSection === 'profile' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  User Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-xl font-bold text-indigo-600">
                        {profileForm.firstName?.charAt(0)}{profileForm.lastName?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-gray-900">
                        {profileForm.firstName} {profileForm.lastName}
                      </p>
                      <Badge color="indigo">{user?.role || 'User'}</Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="First Name"
                      value={profileForm.firstName}
                      onChange={(e) => setProfileForm({ ...profileForm, firstName: e.target.value })}
                    />
                    <Input
                      label="Last Name"
                      value={profileForm.lastName}
                      onChange={(e) => setProfileForm({ ...profileForm, lastName: e.target.value })}
                    />
                  </div>
                  <div className="relative">
                    <Input
                      label="Email"
                      type="email"
                      value={profileForm.email}
                      disabled
                    />
                    <Mail className="absolute right-3 top-[34px] w-4 h-4 text-gray-400" />
                  </div>
                  <div className="relative">
                    <Input
                      label="Phone"
                      type="tel"
                      placeholder="+91 XXXXX XXXXX"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    />
                    <Phone className="absolute right-3 top-[34px] w-4 h-4 text-gray-400" />
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleProfileSave} disabled={submitting}>
                      {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Password Section */}
          {activeSection === 'password' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  Change Password
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {passwordError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                      <p className="text-sm text-red-800">{passwordError}</p>
                    </div>
                  )}

                  <div className="relative">
                    <Input
                      label="Current Password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="relative">
                    <Input
                      label="New Password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Enter new password (min. 8 characters)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600"
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter new password"
                    error={
                      passwordForm.confirmPassword && passwordForm.newPassword !== passwordForm.confirmPassword
                        ? 'Passwords do not match'
                        : undefined
                    }
                  />

                  <div className="flex justify-end pt-4 border-t">
                    <Button
                      onClick={handlePasswordChange}
                      disabled={submitting || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                    >
                      {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Lock className="w-4 h-4 mr-2" />}
                      Change Password
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notifications Section */}
          {activeSection === 'notifications' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Channels */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Notification Channels</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'email_notifications' as const, label: 'Email Notifications', desc: 'Receive notifications via email' },
                        { key: 'sms_notifications' as const, label: 'SMS Notifications', desc: 'Receive text message alerts' },
                        { key: 'push_notifications' as const, label: 'Push Notifications', desc: 'Browser push notifications' },
                        { key: 'in_app_notifications' as const, label: 'In-App Notifications', desc: 'Show notifications within the app' },
                      ].map((channel) => (
                        <div key={channel.key} className="flex items-center justify-between py-2">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{channel.label}</p>
                            <p className="text-xs text-gray-400">{channel.desc}</p>
                          </div>
                          <button
                            onClick={() => toggleNotif(channel.key)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              notifPrefs[channel.key] ? 'bg-indigo-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                notifPrefs[channel.key] ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <hr />

                  {/* Alert Types */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Alert Types</h4>
                    <div className="space-y-3">
                      {[
                        { key: 'maintenance_alerts' as const, label: 'Maintenance Alerts', desc: 'New requests and status updates' },
                        { key: 'payment_reminders' as const, label: 'Payment Reminders', desc: 'Upcoming and overdue payments' },
                        { key: 'lease_reminders' as const, label: 'Lease Reminders', desc: 'Lease expiry and renewal reminders' },
                        { key: 'compliance_alerts' as const, label: 'Compliance Alerts', desc: 'Compliance check deadlines' },
                        { key: 'chat_notifications' as const, label: 'Chat Notifications', desc: 'New messages in chat rooms' },
                      ].map((alert) => (
                        <div key={alert.key} className="flex items-center justify-between py-2">
                          <div>
                            <p className="text-sm font-medium text-gray-700">{alert.label}</p>
                            <p className="text-xs text-gray-400">{alert.desc}</p>
                          </div>
                          <button
                            onClick={() => toggleNotif(alert.key)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              notifPrefs[alert.key] ? 'bg-indigo-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                notifPrefs[alert.key] ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t">
                    <Button onClick={handleNotifSave} disabled={submitting}>
                      {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Save Preferences
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Display Section */}
          {activeSection === 'display' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="w-5 h-5" />
                  Display Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Theme</h4>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: 'light', label: 'Light', icon: Sun },
                        { id: 'dark', label: 'Dark', icon: Moon },
                        { id: 'system', label: 'System', icon: Monitor },
                      ].map((t) => {
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setTheme(t.id)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                              theme === t.id
                                ? 'border-indigo-600 bg-indigo-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Icon className={`w-6 h-6 ${theme === t.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <span className={`text-sm font-medium ${theme === t.id ? 'text-indigo-600' : 'text-gray-600'}`}>
                              {t.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <hr />

                  <div className="bg-gray-50 rounded-lg p-4 text-center">
                    <Palette className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">
                      Additional display customization options will be available in a future update.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
