import Link from "next/link"
import { Button } from "../components/ui/button"
import { 
  Search, 
  FileText, 
  Clock, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  Globe,
  Shield,
  Zap,
  ArrowRight
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-4 sm:py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Globe className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-gray-900">eTownz Grants</span>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">Sign In</Button>
              <Button variant="ghost" size="sm" className="sm:hidden px-2">Sign In</Button>
            </Link>
            <Link href="/auth/register">
              <Button size="sm" className="text-sm px-3 sm:px-4">Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-12 sm:py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
            Discover & Apply for Grants in Ireland
            <span className="text-blue-600 block sm:inline"> 10x Faster</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 leading-relaxed px-2">
            Stop wasting time searching through countless websites. Our AI-powered platform automatically discovers relevant grants, 
            tracks deadlines, and helps you submit winning applications.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center max-w-md sm:max-w-none mx-auto">
            <Link href="/auth/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                Start Free Trial
                <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
              </Button>
            </Link>
            <Link href="#how-it-works" className="w-full sm:w-auto">
              <Button variant="outline" size="lg" className="w-full sm:w-auto text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4">
                See How It Works
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4 px-4">No credit card required • 14-day free trial</p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
          {[
            { number: "500+", label: "Active Grants Tracked" },
            { number: "95%", label: "Time Saved on Discovery" },
            { number: "€50M+", label: "Funding Secured" },
            { number: "1,200+", label: "Irish Organizations" }
          ].map((stat, index) => (
            <div key={index} className="p-6">
              <div className="text-3xl font-bold text-blue-600 mb-2">{stat.number}</div>
              <div className="text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How eTownz Grants Works</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Our platform automates the entire grant discovery and application process, saving you weeks of manual work.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Search,
                title: "AI-Powered Discovery",
                description: "Our system automatically scans 500+ Irish grant sources daily, finding opportunities that match your organization's profile and needs."
              },
              {
                icon: FileText,
                title: "Smart Application Builder",
                description: "Generate professional grant applications using our AI templates. Reuse content across applications and maintain consistency."
              },
              {
                icon: Clock,
                title: "Deadline Management",
                description: "Never miss another deadline. Get automated reminders, track application progress, and manage your grant portfolio in one place."
              }
            ].map((step, index) => (
              <div key={index} className="text-center p-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <step.icon className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">{step.title}</h3>
                <p className="text-gray-600 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Irish Organizations Choose Us</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: Zap,
                title: "Save 95% of Research Time",
                description: "Stop manually searching through Enterprise Ireland, SFI, councils, and EU sources. We do it automatically."
              },
              {
                icon: TrendingUp,
                title: "Higher Success Rates",
                description: "Our AI analyzes successful applications to help you write more compelling proposals with better outcomes."
              },
              {
                icon: Users,
                title: "Team Collaboration",
                description: "Multiple team members can collaborate on applications with role-based permissions and approval workflows."
              },
              {
                icon: CheckCircle,
                title: "Compliance Tracking",
                description: "Ensure all applications meet requirements with automated compliance checks and document validation."
              },
              {
                icon: Shield,
                title: "Secure & Compliant",
                description: "Bank-level security with GDPR compliance. Your sensitive data is protected with enterprise-grade encryption."
              },
              {
                icon: Globe,
                title: "Ireland-Focused",
                description: "Covers all major Irish funding sources: government, local councils, EU programs, and private foundations."
              }
            ].map((benefit, index) => (
              <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{benefit.title}</h3>
                <p className="text-gray-600">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Transform Your Grant Process?
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            Join over 1,200 Irish organizations that have already secured €50M+ in funding using our platform.
          </p>
          <Link href="/auth/register">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-4">
              Start Your Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900">eTownz Grants</span>
              </div>
              <p className="text-gray-600">
                AI-powered grant discovery and application platform for Irish organizations.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="#" className="hover:text-blue-600">Features</Link></li>
                <li><Link href="#" className="hover:text-blue-600">Pricing</Link></li>
                <li><Link href="#" className="hover:text-blue-600">API</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Support</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="#" className="hover:text-blue-600">Help Center</Link></li>
                <li><Link href="#" className="hover:text-blue-600">Contact</Link></li>
                <li><Link href="#" className="hover:text-blue-600">Status</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
              <ul className="space-y-2 text-gray-600">
                <li><Link href="#" className="hover:text-blue-600">About</Link></li>
                <li><Link href="#" className="hover:text-blue-600">Privacy</Link></li>
                <li><Link href="#" className="hover:text-blue-600">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-600">
            <p>&copy; 2024 eTownz Grants. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
