import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { PenTool, GraduationCap, ArrowLeft } from 'lucide-react';
import { PageTransition } from '../components/ui';

export default function RoleSelection() {
  return (
    <PageTransition>
      <div className="min-h-screen flex items-center justify-center px-6 py-12 bg-[#F8FAFC] relative">
        <Link to="/" className="absolute top-8 left-8 inline-flex items-center gap-2 text-sm text-[#475569] hover:text-[#2563EB] transition-colors">
          <ArrowLeft size={16} /> Back to home
        </Link>

        <div className="max-w-2xl w-full relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold mb-3 text-[#0F172A]" style={{ fontFamily: 'var(--font-heading)' }}>
              Join <span className="text-[#2563EB]">Lora</span>
            </h1>
            <p className="text-[#475569]">Choose how you want to use the platform</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Creator Card */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Link to="/signup/creator" className="block">
                <div className="bg-white rounded-3xl p-10 border-2 border-[#E2E8F0] hover:border-[#2563EB] hover:shadow-xl cursor-pointer transition-all duration-300 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-[#DBEAFE] rounded-2xl flex items-center justify-center mb-8">
                    <PenTool size={40} className="text-[#2563EB]" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F172A] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                    I'm a Creator
                  </h2>
                  <p className="text-sm text-[#475569] leading-relaxed mb-8">
                    Create session packs, schedule live classes, and accept payments from students worldwide.
                  </p>
                  <span className="bg-[#2563EB] text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-[#1D4ED8] transition-all duration-200 w-full inline-flex items-center justify-center">
                    Get Started
                  </span>
                </div>
              </Link>
            </motion.div>

            {/* Learner Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <Link to="/signup/learner" className="block">
                <div className="bg-white rounded-3xl p-10 border-2 border-[#E2E8F0] hover:border-[#2563EB] hover:shadow-xl cursor-pointer transition-all duration-300 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-[#DBEAFE] rounded-2xl flex items-center justify-center mb-8">
                    <GraduationCap size={40} className="text-[#2563EB]" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F172A] mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                    I'm a Learner
                  </h2>
                  <p className="text-sm text-[#475569] leading-relaxed mb-8">
                    Discover live sessions, join free previews, enroll in courses, and learn from the best.
                  </p>
                  <span className="border-2 border-[#2563EB] text-[#2563EB] font-semibold px-8 py-3.5 rounded-xl hover:bg-[#2563EB] hover:text-white transition-all duration-200 w-full inline-flex items-center justify-center">
                    Start Learning
                  </span>
                </div>
              </Link>
            </motion.div>
          </div>

          <p className="text-center text-sm text-[#475569] mt-10">
            Already have an account?{' '}
            <Link to="/login" className="text-[#2563EB] font-semibold hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
