import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Shield, Globe, Users, ArrowRight,
  CheckCircle, PlayCircle, CreditCard, Zap, Sparkles
} from 'lucide-react';
import { PageTransition } from '../components/ui';
import loraLogo from '../../Logo/Loralogo1.png';

const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.8, ease: [0.25, 1, 0.5, 1] }
};

const heroFadeUp = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 1, 0.5, 1] } }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.15 } }
};

const features = [
  {
    icon: Globe,
    title: 'No Stripe? No Problem.',
    desc: 'Accept payments via any local method — bKash, UPI, bank transfer, QR codes. Your students pay directly to your account, skipping the international gateway hurdles.'
  },
  {
    icon: Shield,
    title: 'Manual Verification',
    desc: 'Students upload payment proof directly to your dashboard. You verify the receipt and unlock access with a single click. Simple, secure, and completely fraud-resistant.'
  },
  {
    icon: PlayCircle,
    title: 'Free Preview Sessions',
    desc: 'Let students join a free live session before committing. Build absolute trust, showcase your expertise, and dramatically boost your course conversion rates.'
  },
  {
    icon: Users,
    title: 'Session-Based Learning',
    desc: 'Schedule live Zoom sessions, automatically share recordings, and build a thriving, interactive community around your core expertise.'
  }
];

const steps = [
  { num: '01', title: 'Create Your Premium Pack', desc: 'Add your live sessions, set your local pricing, upload beautiful thumbnails, and optionally add a free preview session to draw students in.' },
  { num: '02', title: 'Share Your Custom Link', desc: 'Students discover your beautiful landing page, watch your intro video, and experience your free preview session.' },
  { num: '03', title: 'Get Paid Directly', desc: 'Students pay using your local payment link (or bank details) and upload their receipt proof. You verify it on your dashboard.' },
  { num: '04', title: 'Teach & Grow Globally', desc: 'Deliver high-quality live sessions on Zoom, automatically share recordings, and grow your student base without borders.' }
];

export default function LandingPage() {
  const scrollRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: scrollRef, offset: ["start end", "end start"] });
  const yBg = useTransform(scrollYProgress, [0, 1], [0, -100]);

  const [processedLogo, setProcessedLogo] = useState(loraLogo);

  useEffect(() => {
    const img = new Image();
    img.src = loraLogo;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        // Make very dark pixels transparent
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] < 45 && data[i+1] < 45 && data[i+2] < 45) {
            data[i+3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        setProcessedLogo(canvas.toDataURL());
      } catch (e) {
        console.error("Could not process logo:", e);
      }
    };
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] overflow-hidden" ref={scrollRef}>
        {/* ── NAVBAR ── */}
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-[#E8E8E8]">
          <div className="max-w-7xl mx-auto px-8 md:px-12 flex items-center justify-between py-6">
            <Link to="/" className="flex items-center gap-2 pl-0">
              <img src={processedLogo} alt="Lora" className="h-32 md:h-40 w-auto object-contain scale-110" />
            </Link>
            <div className="flex items-center gap-12">
              <Link to="/login" className="text-[#6B6B6B] font-bold text-xl hover:text-[#2563EB] transition-all duration-300 hover:drop-shadow-[0_0_12px_rgba(37,99,235,0.8)]">Log In</Link>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#2563EB] via-cyan-400 to-[#2563EB] rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
                <Link to="/signup" className="relative inline-flex bg-[#2563EB] text-white font-bold text-xl px-12 py-4 rounded-2xl hover:bg-[#1D4ED8] hover:-translate-y-1 transition-all duration-300">
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="relative overflow-hidden min-h-screen flex flex-col items-center justify-center text-center px-6 pt-24 pb-20 bg-gradient-to-b from-[#FAFAFA] to-[#DBEAFE]/30">
          
          {/* Animated Background Blobs */}
          <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none flex items-center justify-center mix-blend-multiply opacity-60">
            <motion.div
              animate={{
                scale: [1, 1.25, 1],
                x: [0, 100, 0],
                y: [0, -80, 0],
                rotate: [0, 45, 0]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
              className="absolute w-[600px] md:w-[900px] h-[600px] md:h-[900px] bg-gradient-to-br from-[#2563EB]/30 to-[#60A5FA]/30 rounded-full blur-[100px]"
            />
            <motion.div
              animate={{
                scale: [1, 1.35, 1],
                x: [0, -120, 0],
                y: [0, 100, 0],
                rotate: [0, -30, 0]
              }}
              transition={{ duration: 20, repeat: Infinity, ease: "easeInOut", delay: 2 }}
              className="absolute w-[500px] md:w-[800px] h-[500px] md:h-[800px] bg-gradient-to-tl from-[#3B82F6]/20 to-[#93C5FD]/30 rounded-full blur-[100px] right-1/4"
            />
          </div>

          <div className="relative z-10 max-w-5xl mx-auto flex flex-col items-center gap-8">
          
            {/* Eyebrow label */}
            <div className="inline-flex items-center gap-2 border border-[#2563EB]/30 bg-[#DBEAFE]/50 text-[#2563EB] text-xs font-bold tracking-[0.2em] uppercase px-5 py-2.5 rounded-full">
              <span>✦</span>
              <span>The Creator-First Platform</span>
              <span>✦</span>
            </div>
            
            {/* Main heading */}
            <h1 className="font-['Playfair_Display'] font-bold text-6xl md:text-7xl lg:text-8xl leading-[1.1] tracking-tight text-[#1A1A1A]">
              Teach the world,<br className="hidden md:block" />{' '}
              <span className="text-[#2563EB] italic">get paid</span>{' '}
              your way.
            </h1>
            
            {/* Subtext */}
            <p className="text-lg md:text-xl text-[#6B6B6B] max-w-2xl mx-auto leading-relaxed">
              The premium course platform designed for creators who can't access
              Stripe or PayPal. Accept any local payment method. Verify manually.
              Start earning today.
            </p>
            
            {/* Buttons row */}
            <div className="flex flex-row items-center gap-8 mt-8">
              
              {/* Primary Button with continuous spinning border */}
              <div className="relative group hover:-translate-y-1 transition-all duration-300 ease-out shadow-xl hover:shadow-2xl rounded-2xl">
                {/* Ambient blur glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-[#2563EB] via-cyan-400 to-[#2563EB] rounded-2xl blur-lg opacity-50 group-hover:opacity-80 transition duration-500 animate-pulse"></div>
                
                {/* Spinning border container */}
                <div className="relative rounded-2xl overflow-hidden p-[3px]">
                  {/* Spinning conic gradient background */}
                  <div className="absolute inset-[-500%] animate-spin bg-[conic-gradient(from_90deg_at_50%_50%,#38BDF8_0%,#2563EB_30%,#DBEAFE_50%,#2563EB_70%,#38BDF8_100%)]" style={{ animationDuration: '3s' }}></div>
                  
                  {/* The actual button content */}
                  <Link to="/signup/creator" className="relative flex items-center justify-center gap-4 bg-[#2563EB] text-white font-bold text-xl px-14 py-6 rounded-[13px] overflow-hidden">
                    <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
                    <span className="relative">Start Teaching</span>
                    <span className="relative text-2xl group-hover:translate-x-1 transition-transform duration-200">→</span>
                  </Link>
                </div>
              </div>
              
              {/* Secondary Button with spinning border on hover */}
              <div className="relative group hover:-translate-y-1 transition-all duration-300 ease-out shadow-md hover:shadow-xl rounded-2xl">
                <div className="relative rounded-2xl overflow-hidden p-[3px] bg-[#1A1A1A]/10">
                  <div className="absolute inset-[-500%] animate-spin bg-[conic-gradient(from_90deg_at_50%_50%,transparent_0%,#2563EB_50%,transparent_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ animationDuration: '3s' }}></div>
                  <Link to="/signup/learner" className="relative flex items-center justify-center gap-4 bg-white text-[#1A1A1A] font-bold text-xl px-14 py-6 rounded-[13px] group-hover:text-[#2563EB]">
                    Join as Learner
                  </Link>
                </div>
              </div>
            </div>
            
            {/* Trust badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 mt-2">
              {['Free to start', 'No transaction fees', 'Any payment method'].map(text => (
                <div key={text} className="flex items-center gap-2 text-sm text-[#6B6B6B]">
                  <svg className="w-4 h-4 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{text}</span>
                </div>
              ))}
            </div>
            
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section className="py-20 md:py-28 px-6 md:px-12 lg:px-24 bg-white relative">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#E2E8F0] to-transparent" />
          
          <div className="max-w-6xl mx-auto">
            <motion.div
              className="mb-20 max-w-2xl mx-auto text-center"
              variants={fadeUp}
              initial="initial"
              whileInView="whileInView"
              viewport={{ once: true, margin: "-100px" }}
            >
              <span className="text-sm tracking-[0.3em] uppercase text-[#2563EB] font-bold block mb-4">
                Everything You Need
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-[#0F172A] leading-tight tracking-tighter" style={{ fontFamily: 'var(--font-heading)' }}>
                Built for creators everywhere.
              </h2>
            </motion.div>

            <div className="space-y-20 md:space-y-24">
              {features.map((f, i) => (
                <motion.div
                  key={i}
                  className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} items-center gap-10 md:gap-20`}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                >
                  <div className="flex-1 space-y-6 relative">
                    <h3 className="text-3xl font-bold text-[#0F172A] tracking-tight">{f.title}</h3>
                    <p className="text-lg text-[#475569] leading-relaxed tracking-wide font-light">
                      {f.desc}
                    </p>
                  </div>
                  
                  <div className="flex-1 w-full flex justify-center items-center relative">
                    <div className="absolute w-64 h-64 bg-[#2563EB]/10 rounded-full blur-3xl animate-pulse"></div>
                    <motion.div 
                      className="w-48 h-48 rounded-full bg-gradient-to-br from-[#DBEAFE] to-white border-4 border-white shadow-[0_10px_40px_rgba(37,99,235,0.15)] flex items-center justify-center relative z-10"
                      whileHover={{ scale: 1.05, rotate: 10 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <f.icon size={80} className="text-[#2563EB] drop-shadow-md" />
                    </motion.div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section className="py-32 md:py-48 px-6 md:px-12 lg:px-24 bg-[#0F172A] text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9InJnYmEoMjU1LCAyNTUsLCAyNTUsIDAuMDUpIi8+PC9zdmc+')] opacity-50" />
          
          <div className="max-w-7xl mx-auto relative z-10">
            <motion.div
              className="text-center mb-32"
              variants={fadeUp}
              initial="initial"
              whileInView="whileInView"
              viewport={{ once: true }}
            >
              <span className="text-sm tracking-[0.3em] uppercase text-[#DBEAFE] font-bold block mb-6">
                How It Works
              </span>
              <h2 className="text-5xl md:text-7xl font-bold mt-6 mb-6 tracking-tighter" style={{ fontFamily: 'var(--font-heading)' }}>
                Four steps to independence.
              </h2>
            </motion.div>

            <div className="grid md:grid-cols-2 gap-x-20 gap-y-32">
              {steps.map((s, i) => (
                <motion.div
                  key={i}
                  className="relative group"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: i * 0.1, duration: 0.8 }}
                >
                  <span
                    className="absolute -top-20 -left-10 text-[180px] font-black text-white/[0.03] group-hover:text-[#2563EB]/10 transition-colors duration-700 pointer-events-none select-none"
                    style={{ fontFamily: 'var(--font-heading)', lineHeight: 0.8 }}
                  >
                    {s.num}
                  </span>
                  
                  <div className="relative z-10 pt-8 border-t-2 border-white/10 group-hover:border-[#2563EB] transition-colors duration-500">
                    <span className="text-[#2563EB] font-bold tracking-widest text-lg mb-4 block">STEP {s.num}</span>
                    <h3 className="text-3xl font-bold mb-6 tracking-wide">{s.title}</h3>
                    <p className="text-xl text-[#94A6B8] leading-relaxed tracking-wide font-light group-hover:text-white transition-colors duration-500">
                      {s.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="min-h-[80vh] flex flex-col items-center justify-center px-6 md:px-12 lg:px-24 bg-[#2563EB] relative overflow-hidden">
          <motion.div style={{ y: yBg }} className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIconDeS0iMjAiIHI9IjEiIGZpbGw9InJnYmEoMjU1LCAyNTUsLCAyNTUsIDAuMykiLz48L3N2Zz4=')] opacity-20" />
          
          <motion.div
            className="max-w-5xl mx-auto text-center relative z-10 w-full"
            variants={fadeUp}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
          >
            <h2 className="text-6xl md:text-8xl font-bold mb-10 leading-tight text-white tracking-tighter" style={{ fontFamily: 'var(--font-heading)' }}>
              Ready to start teaching?
            </h2>
            <p className="text-[#DBEAFE] text-2xl mb-16 mt-6 max-w-3xl mx-auto leading-relaxed tracking-wide font-light">
              Join hundreds of creators who are monetizing their expertise today, without needing international payment gateways.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <Link to="/signup/creator" className="bg-white text-[#2563EB] font-bold tracking-wide px-12 py-6 rounded-full text-xl hover:scale-105 hover:shadow-2xl transition-all duration-300 ease-out inline-flex items-center justify-center gap-3 w-full sm:w-auto">
                Create Your First Pack <ArrowRight size={24} />
              </Link>
            </div>
          </motion.div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="bg-[#0F172A] border-t border-white/10 py-16 px-8 md:px-16 text-white">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="flex flex-col items-center md:items-start gap-2">
              <span className="text-3xl font-bold tracking-widest text-[#2563EB]" style={{ fontFamily: 'var(--font-heading)' }}>
                Lora
              </span>
              <p className="text-sm tracking-widest text-[#94A6B8] uppercase">Built for creators, everywhere.</p>
            </div>
            
            <p className="text-base tracking-wide text-[#94A6B8] md:absolute md:left-1/2 md:-translate-x-1/2">
              © {new Date().getFullYear()} Lora. All rights reserved.
            </p>
            
            <div className="flex items-center gap-10 text-base font-medium tracking-widest uppercase text-[#94A6B8]">
              <Link to="/signup" className="hover:text-white transition-colors">Get Started</Link>
              <Link to="/login" className="hover:text-white transition-colors">Log In</Link>
            </div>
          </div>
        </footer>
      </div>
    </PageTransition>
  );
}
