import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DashboardWidget, WidgetType, generateDefaultWidgets } from '../../components/dashboard/DashboardGrid'
import { User } from '../auth'

interface DashboardState {
  widgets: DashboardWidget[]
  isCustomizing: boolean
  preferences: {
    theme: 'light' | 'dark' | 'auto'
    compactMode: boolean
    showAnimations: boolean
  }
  
  // Actions
  setWidgets: (widgets: DashboardWidget[]) => void
  updateWidget: (widgetId: string, updates: Partial<DashboardWidget>) => void
  resetToDefaults: (user: User) => void
  setCustomizing: (customizing: boolean) => void
  updatePreferences: (preferences: Partial<DashboardState['preferences']>) => void
  addWidget: (type: WidgetType, title: string, size?: DashboardWidget['size']) => void
  removeWidget: (widgetId: string) => void
  
  // Utility
  getVisibleWidgets: () => DashboardWidget[]
  getHiddenWidgets: () => DashboardWidget[]
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set, get) => ({
      widgets: [],
      isCustomizing: false,
      preferences: {
        theme: 'light',
        compactMode: false,
        showAnimations: true
      },

      setWidgets: (widgets) => set({ widgets }),

      updateWidget: (widgetId, updates) => set((state) => ({
        widgets: state.widgets.map(widget =>
          widget.id === widgetId ? { ...widget, ...updates } : widget
        )
      })),

      resetToDefaults: (user) => set({
        widgets: generateDefaultWidgets(user)
      }),

      setCustomizing: (isCustomizing) => set({ isCustomizing }),

      updatePreferences: (newPreferences) => set((state) => ({
        preferences: { ...state.preferences, ...newPreferences }
      })),

      addWidget: (type, title, size = 'medium') => {
        const state = get()
        const newWidget: DashboardWidget = {
          id: `${type}-${Date.now()}`,
          type,
          title,
          size,
          position: state.widgets.length,
          visible: true,
          data: {},
          config: {}
        }
        set({ widgets: [...state.widgets, newWidget] })
      },

      removeWidget: (widgetId) => set((state) => ({
        widgets: state.widgets.filter(widget => widget.id !== widgetId)
      })),

      getVisibleWidgets: () => {
        const state = get()
        return state.widgets
          .filter(widget => widget.visible)
          .sort((a, b) => a.position - b.position)
      },

      getHiddenWidgets: () => {
        const state = get()
        return state.widgets.filter(widget => !widget.visible)
      }
    }),
    {
      name: 'dashboard-preferences',
      partialize: (state) => ({
        widgets: state.widgets,
        preferences: state.preferences
      })
    }
  )
)

// Hook for dashboard analytics
export const useDashboardAnalytics = () => {
  const trackWidgetInteraction = (widgetId: string, action: string) => {
    // Track widget usage for analytics
    console.log(`Widget ${widgetId}: ${action}`)
    // In a real app, this would send to analytics service
  }

  const trackDashboardCustomization = (action: string, data?: any) => {
    // Track customization events
    console.log(`Dashboard customization: ${action}`, data)
  }

  return {
    trackWidgetInteraction,
    trackDashboardCustomization
  }
}