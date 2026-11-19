import React from 'react';
import { motion } from 'motion/react';
import { GraduationCap } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import type { PortfolioSection } from '../../types/portfolio';
import { MediaImage } from '../common/MediaImage';

export function EducationSection({ section }: { section: PortfolioSection }) {
  const { data } = usePortfolio();
  const education = data.education.filter((e) => e.isPublished);

  return (
    <section
      id="education"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {education.map((edu, idx) => (
            <motion.article
              key={edu.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: idx * 0.05 }}
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0F131A] p-6 sm:p-7 space-y-5"
            >
              <div className="flex items-start gap-4">
                {edu.logoMediaId ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                    <MediaImage
                      mediaId={edu.logoMediaId}
                      useThumbnail
                      fallbackTitle={edu.institution}
                      className="w-full h-full"
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                )}

                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono tabular-nums">{edu.studyPeriod}</span>
                    {edu.location && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{edu.location}</span>
                      </>
                    )}
                  </div>
                  <h3 className="text-lg font-display font-semibold text-slate-950 dark:text-white">
                    {edu.institution}
                  </h3>
                  <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                    {edu.degree}
                  </p>
                </div>
              </div>

              {edu.description && (
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {edu.description}
                </p>
              )}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
