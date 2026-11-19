import React from 'react';
import { motion } from 'motion/react';
import { Download } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import type { PortfolioSection } from '../../types/portfolio';
import { MediaImage } from '../common/MediaImage';
import { MagneticButton } from './MagneticButton';

export function AboutSection({ section }: { section: PortfolioSection }) {
  const { data } = usePortfolio();
  const { about } = data;

  return (
    <section
      id="about"
      className="py-20 lg:py-28 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#090C12]"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-14 space-y-2">
          <p className="text-xs font-medium tracking-wide text-blue-600 dark:text-blue-400">
            {section.subtitle}
          </p>
          <h2 className="text-3xl sm:text-4xl font-display font-bold tracking-tight text-slate-950 dark:text-white text-balance">
            {section.title}
          </h2>
          {section.description && (
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              {section.description}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-stretch">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5"
          >
            <div className="h-full min-h-[320px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-[#0F131A]">
              <MediaImage
                mediaId={about.photoMediaId}
                fallbackTitle="Engineering Studio"
                className="w-full h-full"
                imgClassName="w-full h-full object-cover"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: 0.08 }}
            className="lg:col-span-7 flex flex-col justify-between space-y-8"
          >
            <div className="space-y-6">
              <p className="text-xl sm:text-2xl font-display font-medium leading-snug text-slate-900 dark:text-slate-100 text-balance">
                {about.introduction}
              </p>

              <p className="text-base text-slate-600 dark:text-slate-400 leading-relaxed">
                {about.summary}
              </p>

              {about.background && (
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {about.background}
                </p>
              )}

              {about.philosophy && (
                <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F131A]">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1.5">
                    Engineering Philosophy
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {about.philosophy}
                  </p>
                </div>
              )}

              {(about.expertiseAreas ?? []).length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-display font-semibold text-slate-900 dark:text-slate-100">
                    Areas of Expertise
                  </h3>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2.5 text-sm text-slate-600 dark:text-slate-300">
                    {(about.expertiseAreas ?? []).map((area, idx) => (
                      <li
                        key={idx}
                        className="pb-2 border-b border-slate-200/70 dark:border-slate-800/70"
                      >
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {about.cvDownloadLabel && (
              <div className="pt-2">
                <MagneticButton
                  href={about.cvUrl || '#contact'}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 text-sm font-medium hover:bg-slate-800 dark:hover:bg-white transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>{about.cvDownloadLabel}</span>
                </MagneticButton>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
