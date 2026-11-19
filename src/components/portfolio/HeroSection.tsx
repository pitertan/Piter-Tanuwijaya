import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowDown, ArrowUpRight, Moon, Sun } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useTheme } from '../../context/ThemeContext';
import { MediaImage } from '../common/MediaImage';
import { MagneticButton } from './MagneticButton';
import { ParticleField } from './ParticleField';

export function HeroSection() {
  const { data, loading, hasCachedSnapshot } = usePortfolio();
  const { theme, toggleTheme } = useTheme();
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  const portraitY = useTransform(scrollYProgress, [0, 1], [0, 48]);

  const { profile, hero, siteSettings } = data;

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative overflow-hidden border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-[#07090D]"
    >
      {/* Subtle architectural grid & interactive geometric particle field */}
      <div className="absolute inset-0 bg-architectural-grid pointer-events-none" />
      <div
        aria-hidden="true"
        className="absolute -top-40 right-0 w-[560px] h-[560px] rounded-full bg-blue-600/10 dark:bg-blue-500/10 blur-[120px] pointer-events-none"
      />
      <ParticleField enabled={siteSettings.enableParticles} />

      <div className="relative max-w-7xl mx-auto px-6 pt-10 pb-12 lg:pt-14 lg:pb-16">
        {/* Split-screen hero: balanced editorial column + portrait frame */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          <div className="lg:col-span-7 flex flex-col justify-center gap-8">
            <div className="space-y-6">
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45 }}
                className="text-xs font-medium tracking-wide text-blue-600 dark:text-blue-400"
              >
                {hero.eyebrow}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.05 }}
                className="space-y-4"
              >
                <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-display font-bold tracking-tight leading-[1.08] text-slate-950 dark:text-white text-balance">
                  {profile.fullName}
                </h1>
                <p className="text-lg sm:text-xl font-display font-medium text-slate-700 dark:text-slate-300 text-balance">
                  {profile.roleTitle}
                </p>
              </motion.div>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.12 }}
                className="text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl"
              >
                {hero.headline} {hero.subheadline}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="space-y-6"
            >
              <div className="flex flex-wrap items-center gap-4">
                <MagneticButton
                  href={hero.primaryCtaTarget}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors shadow-sm whitespace-nowrap shrink-0"
                >
                  <span>{hero.primaryCtaLabel}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </MagneticButton>

                <MagneticButton
                  href={hero.secondaryCtaTarget}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 text-slate-900 dark:text-slate-100 text-sm font-medium hover:border-blue-500/60 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>{hero.secondaryCtaLabel}</span>
                </MagneticButton>
              </div>

              {/* Clean metadata & workspace utility row */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200/80 dark:border-slate-800/80 text-xs text-slate-500 dark:text-slate-400">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{profile.location}</span>
                  <span aria-hidden="true">·</span>
                  <span>{profile.availabilityText}</span>
                </div>

                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] text-slate-700 dark:text-slate-300 hover:border-blue-500/50 transition-colors whitespace-nowrap shrink-0"
                >
                  {theme === 'dark' ? (
                    <>
                      <Sun className="w-3.5 h-3.5" />
                      <span>Light Mode</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5" />
                      <span>Dark Mode</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>

          {/* Right column: Portrait with subtle scroll parallax */}
          <div className="lg:col-span-5 flex">
            <motion.div
              style={{ y: portraitY }}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full aspect-[4/5] lg:aspect-auto lg:h-[460px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-[#0F131A]"
            >
              {loading && !hasCachedSnapshot ? (
                <div
                  aria-hidden="true"
                  className="w-full h-full animate-pulse bg-slate-200 dark:bg-slate-900"
                />
              ) : (
                <MediaImage
                  mediaId={hero.portraitMediaId}
                  fallbackTitle={profile.fullName}
                  priority
                  className="w-full h-full"
                  imgClassName="w-full h-full object-cover object-top"
                />
              )}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent pointer-events-none"
              />
              <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between gap-4 text-white">
                <div>
                  <p className="text-xs text-slate-300">Principal Practice</p>
                  <p className="text-sm font-display font-medium">{profile.tagline}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Full-width 4-column metric strip below hero split */}
        {(hero.metrics ?? []).length > 0 && (
          <div className="mt-10 pt-8 border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-2 lg:grid-cols-4 gap-8">
            {(hero.metrics ?? []).map((metric, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className="space-y-1"
              >
                <p className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-slate-950 dark:text-white tabular-nums">
                  {metric.value}
                </p>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  {metric.label}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {metric.detail}
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Scroll indicator */}
        <div className="mt-10 flex justify-center">
          <a
            href="#about"
            aria-label="Scroll to About section"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            <span>Scroll to explore</span>
            <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
          </a>
        </div>
      </div>
    </section>
  );
}
