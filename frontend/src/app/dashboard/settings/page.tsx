"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../../components/ui/card"
import { Button } from "../../../components/ui/button"
import { Input } from "../../../components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs"
import { Sidebar } from "../../../components/layout/Sidebar"
import { 
  User as UserIcon, 
  Bell, 
  Shield, 
  Key,
  Building,
  Save,
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react"
import { User, hasPermission } from "../../../lib/auth"

interface NotificationSettings {
  emailDeadlines: boolean
  emailNewGrants: boolean
  emailApplicationUpdates: boolean
  pushNotifications: boolean
  weeklyDigest: boolean
}

interface SecuritySettings {
  twoFactorEnabled: boolean
  lastPasswordChange: Date
  activeSessions: number
}

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const router = useRouter()

  // Form states
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    timezone: 'Europe/Dublin',
    language: 'en'
  })

  const [organization, setOrganization] = useState({
    name: '',
    description: '',
    website: '',
    sector: '',
    size: '',
    location: ''
  })

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailDeadlines: true,
    emailNewGrants: true,
    emailApplicationUpdates: true,
    pushNotifications: false,
    weeklyDigest: true
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [security] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    lastPasswordChange: new Date('2024-01-15'),
    activeSessions: 2
  })

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token')
    const userStr = localStorage.getItem('user')
    
    if (!token || !userStr) {
      router.push('/auth/login')
      return
    }

    try {
      const userData = JSON.parse(userStr)
      setUser(userData)
      setProfile({
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        timezone: 'Europe/Dublin',
        language: 'en'
      })
      
      // Load organization data if user has permission
      if (hasPermission(userData, 'canEditOrganization')) {
        loadOrganizationData()
      }
    } catch (error) {
      console.error('Error parsing user data:', error)
      router.push('/auth/login')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const loadOrganizationData = async () => {
    // Mock organization data - in real app, fetch from API
    setOrganization({
      name: 'Tech Innovation Ltd',
      description: 'A forward-thinking technology startup focused on AI solutions',
      website: 'https://techinnovation.ie',
      sector: 'Technology',
      size: 'Small (10-50 employees)',
      location: 'Dublin, Ireland'
    })
  }

  const handleProfileSave = async () => {
    setSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update user in localStorage
      if (user) {
        const updatedUser = { ...user, ...profile }
        localStorage.setItem('user', JSON.stringify(updatedUser))
        setUser(updatedUser)
      }
      
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleNotificationsSave = async () => {
    setSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error saving notifications:', error)
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('New passwords do not match')
      return
    }

    setSaving(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (error) {
      console.error('Error changing password:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-50">
      <Sidebar user={user} onLogout={handleLogout} />
      
      <div className="flex-1 overflow-auto">
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Header */}
          <div className="mb-6 lg:mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Settings
                </h1>
                <p className="text-gray-600 mt-2">
                  Manage your account preferences and organization settings
                </p>
              </div>
              {saveSuccess && (
                <div className="flex items-center text-green-600 bg-green-50 px-4 py-2 rounded-md">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  <span>Settings saved successfully</span>
                </div>
              )}
            </div>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              {hasPermission(user, 'canEditOrganization') && (
                <TabsTrigger value="organization">Organization</TabsTrigger>
              )}
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserIcon className="w-5 h-5 mr-2" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Update your personal details and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Full Name</label>
                      <Input
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email Address</label>
                      <Input
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        placeholder="Enter your email"
                        type="email"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone Number</label>
                      <Input
                        value={profile.phone}
                        onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                        placeholder="Enter your phone number"
                        type="tel"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Timezone</label>
                      <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={profile.timezone}
                        onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                      >
                        <option value="Europe/Dublin">Europe/Dublin (GMT+1)</option>
                        <option value="Europe/London">Europe/London (GMT)</option>
                        <option value="America/New_York">America/New_York (EST)</option>
                        <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button onClick={handleProfileSave} disabled={isSaving}>
                      {isSaving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notifications Tab */}
            <TabsContent value="notifications" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="w-5 h-5 mr-2" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose how you&apos;d like to be notified about important updates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Grant Deadlines</h4>
                        <p className="text-sm text-gray-600">Get notified about upcoming application deadlines</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.emailDeadlines}
                        onChange={(e) => setNotifications({ ...notifications, emailDeadlines: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">New Grant Opportunities</h4>
                        <p className="text-sm text-gray-600">Be the first to know about new funding opportunities</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.emailNewGrants}
                        onChange={(e) => setNotifications({ ...notifications, emailNewGrants: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Application Updates</h4>
                        <p className="text-sm text-gray-600">Status changes and feedback on your applications</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.emailApplicationUpdates}
                        onChange={(e) => setNotifications({ ...notifications, emailApplicationUpdates: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Weekly Digest</h4>
                        <p className="text-sm text-gray-600">Weekly summary of opportunities and deadlines</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifications.weeklyDigest}
                        onChange={(e) => setNotifications({ ...notifications, weeklyDigest: e.target.checked })}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                    </div>
                  </div>

                  <Button onClick={handleNotificationsSave} disabled={isSaving}>
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save Preferences
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Tab */}
            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 mr-2" />
                    Account Security
                  </CardTitle>
                  <CardDescription>
                    Manage your password and security settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Password Change */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Change Password</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Current Password</label>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? "text" : "password"}
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            placeholder="Enter current password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div></div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">New Password</label>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            placeholder="Enter new password"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Confirm New Password</label>
                        <Input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          placeholder="Confirm new password"
                        />
                      </div>
                    </div>
                    <Button onClick={handlePasswordChange} disabled={isSaving}>
                      <Key className="w-4 h-4 mr-2" />
                      Update Password
                    </Button>
                  </div>

                  {/* Security Status */}
                  <div className="border-t pt-6">
                    <h4 className="font-medium mb-4">Security Status</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>Two-Factor Authentication</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          security.twoFactorEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Last Password Change</span>
                        <span className="text-sm text-gray-600">
                          {security.lastPasswordChange.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Active Sessions</span>
                        <span className="text-sm text-gray-600">{security.activeSessions} devices</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Organization Tab (only for admins) */}
            {hasPermission(user, 'canEditOrganization') && (
              <TabsContent value="organization" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Building className="w-5 h-5 mr-2" />
                      Organization Settings
                    </CardTitle>
                    <CardDescription>
                      Manage your organization&apos;s information and settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Organization Name</label>
                        <Input
                          value={organization.name}
                          onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                          placeholder="Enter organization name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Website</label>
                        <Input
                          value={organization.website}
                          onChange={(e) => setOrganization({ ...organization, website: e.target.value })}
                          placeholder="https://example.com"
                          type="url"
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium">Description</label>
                        <textarea
                          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={organization.description}
                          onChange={(e) => setOrganization({ ...organization, description: e.target.value })}
                          placeholder="Describe your organization..."
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Sector</label>
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={organization.sector}
                          onChange={(e) => setOrganization({ ...organization, sector: e.target.value })}
                        >
                          <option value="">Select sector</option>
                          <option value="Technology">Technology</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Education">Education</option>
                          <option value="Manufacturing">Manufacturing</option>
                          <option value="Finance">Finance</option>
                          <option value="Non-profit">Non-profit</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Size</label>
                        <select 
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={organization.size}
                          onChange={(e) => setOrganization({ ...organization, size: e.target.value })}
                        >
                          <option value="">Select size</option>
                          <option value="Startup (1-10)">Startup (1-10)</option>
                          <option value="Small (10-50)">Small (10-50)</option>
                          <option value="Medium (50-250)">Medium (50-250)</option>
                          <option value="Large (250+)">Large (250+)</option>
                        </select>
                      </div>
                    </div>
                    
                    <Button disabled={isSaving}>
                      <Save className="w-4 h-4 mr-2" />
                      Save Organization Settings
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  )
}