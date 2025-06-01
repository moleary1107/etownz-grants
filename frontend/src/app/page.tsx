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
  ArrowRight,
  Star,
  Target
} from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-teal-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-full blur-3xl floating-animation"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-accent/20 to-primary/20 rounded-full blur-3xl floating-animation" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-secondary/10 to-accent/10 rounded-full blur-3xl floating-animation" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-4 py-6 sm:py-8">
        <nav className="flex items-center justify-between slide-in-up">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/25 pulse-glow">
              <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-xl sm:text-2xl font-extrabold gradient-text">eTownz Grants</span>
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="hidden sm:inline-flex text-base font-semibold hover:bg-primary/10 rounded-xl px-4 py-2">
                Sign In
              </Button>
              <Button variant="ghost" className="inline-flex sm:hidden px-3 text-base font-semibold hover:bg-primary/10 rounded-xl">
                Sign In
              </Button>
            </Link>
            <Link href="/auth/register">
              <button className="btn-primary">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-4 py-12 sm:py-20">
        <div className="text-center max-w-6xl mx-auto">
          <div className="slide-in-up">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black mb-6 sm:mb-8 leading-tight">
              <span className="block">Discover & Apply for</span>
              <span className="gradient-text block">Irish Grants</span>
              <span className="text-3xl sm:text-4xl lg:text-5xl text-accent font-extrabold block mt-2">
                10x Faster ⚡
              </span>
            </h1>
          </div>
          
          <div className="slide-in-up stagger-1">
            <p className="text-lg sm:text-xl lg:text-2xl text-foreground/80 mb-8 sm:mb-12 leading-relaxed max-w-4xl mx-auto font-medium">
              Stop wasting time searching through countless websites. Our <span className="gradient-text font-bold">AI-powered platform</span> automatically discovers relevant grants, 
              tracks deadlines, and helps you submit <span className="text-accent font-bold">winning applications</span>.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center max-w-xl mx-auto slide-in-up stagger-2">
            <Link href="/auth/register" className="w-full sm:w-auto">
              <button className="btn-primary w-full text-lg sm:text-xl py-4 px-8">
                <Zap className="w-5 h-5 mr-2" />
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2" />
              </button>
            </Link>
            <Link href="#how-it-works" className="w-full sm:w-auto">
              <button className="btn-secondary w-full text-lg sm:text-xl py-4 px-8">
                <Star className="w-5 h-5 mr-2" />
                See How It Works
              </button>
            </Link>
          </div>
          
          <div className="slide-in-up stagger-3">
            <p className="text-sm sm:text-base text-muted-foreground mt-6 font-medium">
              🚀 No credit card required • ✨ 14-day free trial • 🎯 Join 1,200+ Irish organizations
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 container mx-auto px-4 py-16 sm:py-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
          <div className="card-interactive text-center slide-in-up stagger-1">
            <div className="text-4xl sm:text-5xl font-black gradient-text mb-3">500+</div>
            <div className="text-base sm:text-lg font-semibold text-foreground/80">Active Grants Tracked</div>
          </div>
          <div className="card-interactive text-center slide-in-up stagger-2">
            <div className="text-4xl sm:text-5xl font-black gradient-text mb-3">95%</div>
            <div className="text-base sm:text-lg font-semibold text-foreground/80">Time Saved on Discovery</div>
          </div>
          <div className="card-interactive text-center slide-in-up stagger-3">
            <div className="text-4xl sm:text-5xl font-black gradient-text mb-3">€50M+</div>
            <div className="text-base sm:text-lg font-semibold text-foreground/80">Funding Secured</div>
          </div>
          <div className="card-interactive text-center slide-in-up stagger-4">
            <div className="text-4xl sm:text-5xl font-black gradient-text mb-3">1,200+</div>
            <div className="text-base sm:text-lg font-semibold text-foreground/80">Irish Organizations</div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative z-10 bg-card/30 backdrop-blur-sm py-20 sm:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 sm:mb-24 slide-in-up">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black gradient-text mb-6">
              How eTownz Grants Works
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-foreground/80 max-w-4xl mx-auto font-medium leading-relaxed">
              Our platform automates the entire grant discovery and application process, 
              <span className="text-accent font-bold"> saving you weeks of manual work</span>.
            </p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 sm:gap-12">
            <div className="card-interactive text-center slide-in-left stagger-1">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-primary to-primary/70 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-primary/25">
                <Search className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">AI-Powered Discovery</h3>
              <p className="text-base sm:text-lg text-foreground/80 leading-relaxed font-medium">
                Our system automatically scans <span className="text-primary font-bold">500+ Irish grant sources</span> daily, 
                finding opportunities that match your organization&apos;s profile and needs.
              </p>
            </div>
            
            <div className="card-interactive text-center slide-in-up stagger-2">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-secondary to-secondary/70 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-secondary/25">
                <FileText className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">Smart Application Builder</h3>
              <p className="text-base sm:text-lg text-foreground/80 leading-relaxed font-medium">
                Generate <span className="text-secondary font-bold">professional grant applications</span> using our AI templates. 
                Reuse content across applications and maintain consistency.
              </p>
            </div>
            
            <div className="card-interactive text-center slide-in-right stagger-3">
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-accent to-accent/70 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-accent/25">
                <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-accent-foreground" />
              </div>
              <h3 className="text-2xl sm:text-3xl font-bold text-foreground mb-6">Deadline Management</h3>
              <p className="text-base sm:text-lg text-foreground/80 leading-relaxed font-medium">
                <span className="text-accent font-bold">Never miss another deadline</span>. Get automated reminders, 
                track application progress, and manage your grant portfolio in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative z-10 py-20 sm:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 sm:mb-24 slide-in-up">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black gradient-text mb-6">
              Why Irish Organizations Choose Us
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            <div className="card-interactive slide-in-up stagger-1">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/25">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Save 95% of Research Time</h3>
              <p className="text-base sm:text-lg text-foreground/80 font-medium leading-relaxed">
                Stop manually searching through Enterprise Ireland, SFI, councils, and EU sources. 
                <span className="text-green-600 font-bold"> We do it automatically</span>.
              </p>
            </div>
            
            <div className="card-interactive slide-in-up stagger-2">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/25">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Higher Success Rates</h3>
              <p className="text-base sm:text-lg text-foreground/80 font-medium leading-relaxed">
                Our AI analyzes successful applications to help you write 
                <span className="text-blue-600 font-bold"> more compelling proposals</span> with better outcomes.
              </p>
            </div>
            
            <div className="card-interactive slide-in-up stagger-3">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-purple-500/25">
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Team Collaboration</h3>
              <p className="text-base sm:text-lg text-foreground/80 font-medium leading-relaxed">
                <span className="text-purple-600 font-bold">Multiple team members</span> can collaborate on applications 
                with role-based permissions and approval workflows.
              </p>
            </div>
            
            <div className="card-interactive slide-in-up stagger-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-orange-500/25">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Compliance Tracking</h3>
              <p className="text-base sm:text-lg text-foreground/80 font-medium leading-relaxed">
                Ensure all applications meet requirements with 
                <span className="text-orange-600 font-bold"> automated compliance checks</span> and document validation.
              </p>
            </div>
            
            <div className="card-interactive slide-in-up stagger-5">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/25">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Secure & Compliant</h3>
              <p className="text-base sm:text-lg text-foreground/80 font-medium leading-relaxed">
                <span className="text-red-600 font-bold">Bank-level security</span> with GDPR compliance. 
                Your sensitive data is protected with enterprise-grade encryption.
              </p>
            </div>
            
            <div className="card-interactive slide-in-up stagger-6">
              <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-teal-500/25">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Ireland-Focused</h3>
              <p className="text-base sm:text-lg text-foreground/80 font-medium leading-relaxed">
                Covers all major Irish funding sources: 
                <span className="text-teal-600 font-bold"> government, local councils, EU programs</span>, and private foundations.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 bg-gradient-to-r from-primary via-secondary to-accent py-20 sm:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="slide-in-up">
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 sm:mb-8">
              Ready to Transform Your Grant Process?
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-white/90 mb-10 sm:mb-12 max-w-4xl mx-auto font-medium leading-relaxed">
              Join over <span className="font-bold text-accent-foreground">1,200 Irish organizations</span> that have already secured 
              <span className="font-bold text-accent-foreground"> €50M+ in funding</span> using our platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center max-w-xl mx-auto">
              <Link href="/auth/register" className="w-full sm:w-auto">
                <button className="btn-accent w-full text-lg sm:text-xl py-4 px-8 shadow-2xl">
                  <Target className="w-5 h-5 mr-2" />
                  Start Your Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-card/50 backdrop-blur-sm py-16 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 sm:gap-12">
            <div className="slide-in-up stagger-1">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-2xl flex items-center justify-center shadow-lg">
                  <Globe className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl sm:text-2xl font-extrabold gradient-text">eTownz Grants</span>
              </div>
              <p className="text-base sm:text-lg text-foreground/80 font-medium leading-relaxed">
                AI-powered grant discovery and application platform for Irish organizations.
              </p>
            </div>
            
            <div className="slide-in-up stagger-2">
              <h4 className="text-lg sm:text-xl font-bold text-foreground mb-6">Product</h4>
              <ul className="space-y-3 text-base sm:text-lg text-foreground/80 font-medium">
                <li><a className="hover:text-primary transition-colors duration-300" href="#">Features</a></li>
                <li><a className="hover:text-primary transition-colors duration-300" href="#">Pricing</a></li>
                <li><a className="hover:text-primary transition-colors duration-300" href="#">API</a></li>
              </ul>
            </div>
            
            <div className="slide-in-up stagger-3">
              <h4 className="text-lg sm:text-xl font-bold text-foreground mb-6">Support</h4>
              <ul className="space-y-3 text-base sm:text-lg text-foreground/80 font-medium">
                <li><a className="hover:text-secondary transition-colors duration-300" href="#">Help Center</a></li>
                <li><a className="hover:text-secondary transition-colors duration-300" href="#">Contact</a></li>
                <li><a className="hover:text-secondary transition-colors duration-300" href="#">Status</a></li>
              </ul>
            </div>
            
            <div className="slide-in-up stagger-4">
              <h4 className="text-lg sm:text-xl font-bold text-foreground mb-6">Company</h4>
              <ul className="space-y-3 text-base sm:text-lg text-foreground/80 font-medium">
                <li><a className="hover:text-accent transition-colors duration-300" href="#">About</a></li>
                <li><a className="hover:text-accent transition-colors duration-300" href="#">Privacy</a></li>
                <li><a className="hover:text-accent transition-colors duration-300" href="#">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-border/50 mt-12 sm:mt-16 pt-8 sm:pt-12 text-center slide-in-up stagger-5">
            <p className="text-base sm:text-lg text-foreground/60 font-medium">
              © 2024 eTownz Grants. All rights reserved. Made with ❤️ in Ireland.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}