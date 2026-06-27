import { motion } from 'framer-motion';
import {
  Upload, BookOpen, Brain, Zap, BarChart3, Target, Clock,
  Sparkles, ChevronRight, GraduationCap, Users, Building2,
  ArrowRight, Check, Star, X
} from '@/lib/lucide-shim';

import { ThemeToggle } from './ThemeToggle';
import { useI18n } from '../lib/i18n';
import { getLandingContent } from '../lib/landingContent';

interface LandingProps {
  onGetStarted: () => void;
  onSeeDemo?: () => void;
}

const featureIcons = [Upload, Brain, Target, Zap, Clock, BarChart3];
const userTypeIcons = [GraduationCap, BookOpen, Sparkles, Users, Building2];

const serif: React.CSSProperties = { fontFamily: 'var(--font-display)' };
const mono: React.CSSProperties = { fontFamily: 'var(--font-mono)' };

export function Landing({ onGetStarted, onSeeDemo }: LandingProps) {
  const { lang } = useI18n();
  const content = getLandingContent(lang);

  return (
    <div className="min-h-screen bg-surface-primary text-text-primary overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-subtle bg-surface-primary/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-px w-8 bg-brand-500" />
              <span
                className="text-lg tracking-tight"
                style={serif}
              >
                Synapse<span className="text-brand-500">.</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <button
                onClick={onGetStarted}
                data-testid="landing-get-started"
                className="px-5 py-2 rounded-[25px] bg-text-primary text-surface-primary text-[11px] uppercase tracking-[0.2em] font-semibold hover:bg-text-secondary transition-colors"
              >
                {content.getStarted}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 sm:pt-36 lg:pt-40 pb-20 lg:pb-32 px-5 sm:px-6 lg:px-12">
        <div className="absolute -top-24 -left-32 w-[36rem] h-[36rem] bg-brand-500/[0.06] rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-40 right-0 w-[28rem] h-[28rem] bg-brand-700/[0.05] rounded-full blur-[140px] pointer-events-none" />

        <div className="relative max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-4 mb-10"
          >
            <div className="h-px w-12 bg-brand-500" />
            <span
              className="text-[10px] uppercase tracking-[0.3em] text-brand-400 font-medium"
              style={mono}
            >
              {content.badge}
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="text-[1.71rem] sm:text-[1.615rem] md:text-[1.9rem] lg:text-[2.565rem] font-bold tracking-tight leading-[1.05] mb-8 text-text-primary"
            style={serif}
          >
            {content.heroTitle}{' '}
            <span className="italic text-text-secondary">{content.heroHighlight}</span>
            <span className="text-brand-500">.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-2xl text-[0.83rem] sm:text-[0.95rem] md:text-[1.07rem] lg:text-[1.187rem] text-text-secondary font-light leading-relaxed mb-10 border-l border-border-default pl-5 sm:pl-8"
          >
            {content.heroSubtitle}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <button
              onClick={onGetStarted}
              className="group flex items-center gap-3 px-[29px] py-[12.5px] rounded-[25px] bg-text-primary text-surface-primary text-[11px] uppercase tracking-[0.25em] font-semibold hover:bg-text-secondary transition-colors"
            >
              {content.ctaPrimary}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onSeeDemo ?? onGetStarted}
              className="group flex items-center gap-3 px-[29px] py-[12.5px] rounded-[25px] border border-border-default text-text-primary text-[11px] uppercase tracking-[0.25em] font-semibold hover:border-brand-500 hover:text-brand-300 transition-colors"
            >
              {content.ctaSecondary}
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </motion.div>


          {onSeeDemo && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.45 }}
              className="mt-6 text-xs text-text-muted"
              style={mono}
            >
              {lang === 'el'
                ? '// Demo: Μάθημα Οικονομικών — χωρίς upload'
                : '// Demo uses preloaded Economics notes — no upload needed'}
            </motion.p>
          )}

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-14 flex flex-wrap gap-x-8 gap-y-3 text-text-tertiary text-sm"
          >
            {content.trust.map(item => (
              <span key={item} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-brand-400" />
                {item}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* User Types */}
      <section className="px-6 lg:px-12 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap gap-x-3 gap-y-3">
            {content.userTypes.map((ut, i) => {
              const Icon = userTypeIcons[i] ?? GraduationCap;
              return (
                <motion.div
                  key={ut.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.06 * i }}
                  className="flex items-center gap-2 px-4 py-2 rounded-[25px] border border-border-subtle bg-surface-card/40 hover:border-brand-500/50 transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 text-brand-400" />
                  <span className="text-xs text-text-secondary uppercase tracking-wider" style={mono}>
                    {ut.label}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 lg:px-12 py-24 border-t border-border-subtle">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
            <div className="lg:col-span-4">
              <h2
                className="text-base sm:text-lg md:text-xl font-semibold tracking-[0.15em] uppercase text-text-primary mb-6"
                style={mono}
              >
                {content.howItWorksTitle}
              </h2>
              <p className="text-text-tertiary leading-relaxed">
                {content.howItWorksSubtitle}
              </p>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-10">
              {content.steps.map((step, i) => (
                <motion.div
                  key={step.num}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{ duration: 0.55, delay: 0.08 * i }}
                  className="group"
                >
                  <div
                    className="text-4xl sm:text-5xl italic text-brand-500/30 group-hover:text-brand-500 transition-colors mb-3"
                    style={serif}
                  >
                    {step.num}
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">{step.title}</h3>
                  <p className="text-sm text-text-tertiary leading-relaxed">{step.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid — bordered editorial frame */}
      <section className="px-6 lg:px-12 py-24">
        <div className="max-w-6xl mx-auto">
          <div className="relative border border-border-default bg-surface-card/30 px-5 sm:px-8 md:px-12 py-12 sm:py-16 md:py-20">
            <div className="absolute top-0 left-0 w-2 h-2 bg-brand-500" />
            <div className="absolute top-0 right-0 w-2 h-2 bg-brand-500" />
            <div className="absolute bottom-0 left-0 w-2 h-2 bg-brand-500" />
            <div className="absolute bottom-0 right-0 w-2 h-2 bg-brand-500" />

            <div className="mb-16 max-w-2xl">
              <h2
                className="text-[11px] font-semibold uppercase tracking-[0.4em] text-brand-400 mb-5"
                style={mono}
              >
                {content.featuresSectionTitle}
              </h2>
              <h3
                className="text-[1.35rem] sm:text-lg md:text-xl lg:text-[1.7rem] font-bold text-text-primary leading-[1.15]"
                style={serif}
              >
                {content.featuresSectionSubtitle}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-14">
              {content.features.map((f, i) => {
                const Icon = featureIcons[i] ?? Upload;
                return (
                  <motion.div
                    key={f.title}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.5, delay: 0.06 * i }}
                    className="space-y-4 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-px bg-border-strong group-hover:bg-brand-500 transition-colors" />
                      <Icon className="w-4 h-4 text-brand-400" />
                    </div>
                    <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">
                      {f.title}
                    </h4>
                    <p className="text-xs text-text-tertiary leading-relaxed">{f.desc}</p>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Differentiation */}
      <section className="px-6 lg:px-12 py-24 border-t border-border-subtle">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 mb-12">
            <div className="lg:col-span-5">
              <h2
                className="text-[11px] font-semibold uppercase tracking-[0.4em] text-brand-400 mb-5"
                style={mono}
              >
                {lang === 'el' ? 'Διαφοροποίηση' : 'Differentiation'}
              </h2>
              <h3
                className="text-[1.28rem] sm:text-[1.07rem] md:text-[1.187rem] lg:text-[1.615rem] font-bold text-text-primary leading-[1.15] mb-4"
                style={serif}
              >
                {content.diffTitle}
              </h3>
              <p className="text-text-tertiary leading-relaxed">{content.diffSubtitle}</p>
            </div>
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-px bg-border-subtle border border-border-subtle">
              {content.diffItems.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.06 * i }}
                  className="bg-surface-primary p-6 hover:bg-surface-card transition-colors"
                >
                  <div className="flex items-start gap-2 mb-3 text-[10px] uppercase tracking-[0.2em] text-text-muted" style={mono}>
                    <X className="w-3 h-3 mt-px text-accent-rose shrink-0" />
                    <span>{item.wrong.replace(/^[^\p{L}\p{N}]+/u, '').trim()}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 mt-0.5 text-brand-400 shrink-0" />
                    <p className="text-sm font-medium text-text-primary leading-relaxed">{item.right.replace(/^[^\p{L}\p{N}]+/u, '').trim()}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="px-6 lg:px-12 py-24">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-1 mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 text-brand-400 fill-brand-400" />
            ))}
          </div>
          <blockquote
            className="text-sm sm:text-base md:text-lg lg:text-xl font-normal text-text-primary mb-8 leading-snug italic"
            style={serif}
          >
            "{content.testimonialQuote}"
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-brand-500" />
            <span className="text-xs uppercase tracking-[0.2em] text-text-secondary" style={mono}>
              {content.testimonialAuthor}
            </span>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 lg:px-12 py-24 border-t border-border-subtle">
        <div className="max-w-6xl mx-auto">
          <div className="relative border border-border-default bg-surface-card/40 p-6 sm:p-12 md:p-20 overflow-hidden">
            <div className="absolute -top-20 -right-20 w-96 h-96 bg-brand-500/[0.08] rounded-full blur-[120px]" />
            <div className="relative max-w-2xl">
              <h2
                className="text-[1.28rem] sm:text-[1.187rem] md:text-[1.615rem] lg:text-[1.9rem] font-bold text-text-primary leading-[1.15] mb-6"
                style={serif}
              >
                {content.ctaTitle}
              </h2>
              <p className="text-lg text-text-secondary leading-relaxed mb-10 max-w-xl">
                {content.ctaSubtitle}
              </p>
              <button
                onClick={onGetStarted}
                className="group inline-flex items-center gap-3 px-[29px] py-[12.5px] rounded-[25px] bg-text-primary text-surface-primary text-[11px] uppercase tracking-[0.25em] font-semibold hover:bg-text-secondary transition-colors"
              >
                {content.ctaButton}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>

            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-12 py-12 border-t border-border-subtle">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-px w-6 bg-brand-500" />
            <span className="text-sm tracking-tight text-text-secondary" style={serif}>
              Synapse<span className="text-brand-500">.</span>
            </span>
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-text-muted" style={mono}>
            {content.footerTagline}
          </p>
        </div>
      </footer>
    </div>
  );
}
