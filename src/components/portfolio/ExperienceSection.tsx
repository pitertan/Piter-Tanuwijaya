import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import type { PortfolioSection } from '../../types/portfolio';
import { MediaImage } from '../common/MediaImage';

export function ExperienceSection({ section }: { section: PortfolioSection }) {
  const { data } = usePortfolio();
  const experiences = data.experiences.filter((e) => e.isPublished);
  const [expandedId, setExpandedId] = useState<string | null>(
    experiences[0]?.id ?? null
  );

  return (
    <section
      id="experience"
      className="py-20 lg:py-28 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-[#07090D]"
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

        {experiences.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No published experience entries yet.
          </p>
        ) : (
          <div className="relative space-y-6 before:hidden md:before:block before:absolute before:left-[18px] before:top-4 before:bottom-4 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
            {experiences.map((exp, idx) => {
              const isOpen = expandedId === exp.id;
              return (
                <motion.article
                  key={exp.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.45, delay: idx * 0.05 }}
                  className="relative md:pl-12"
                >
                  {/* Timeline node */}
                  <span
                    aria-hidden="true"
                    className={`hidden md:flex absolute left-[11px] top-7 w-4 h-4 rounded-full border-2 transition-colors ${
                      isOpen
                        ? 'bg-blue-600 border-blue-400'
                        : 'bg-white dark:bg-[#07090D] border-slate-400 dark:border-slate-600'
                    }`}
                  />

                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setExpandedId(isOpen ? null : exp.id)}
                      aria-expanded={isOpen}
                      className="w-full text-left p-6 sm:p-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-start sm:items-center gap-4 min-w-0">
                        {exp.companyLogoMediaId && (
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 bg-slate-100 dark:bg-slate-900">
                            <MediaImage
                              mediaId={exp.companyLogoMediaId}
                              useThumbnail
                              fallbackTitle={exp.companyName}
                              className="w-full h-full"
                            />
                          </div>
                        )}
                        <div className="min-w-0 space-y-1">
                          <h3 className="text-lg font-display font-semibold text-slate-950 dark:text-white">
                            {exp.jobPosition}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {exp.companyName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">{exp.period}</span>
                            {exp.location && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{exp.location}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChevronDown
                        className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                          isOpen ? 'rotate-180 text-blue-500' : ''
                        }`}
                      />
                    </button>

                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-6 sm:px-7 pb-7 pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-6">
                            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                              {exp.description}
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              {(exp.responsibilities ?? []).length > 0 && (
                                <div className="space-y-2.5">
                                  <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Core Responsibilities
                                  </h4>
                                  <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                    {(exp.responsibilities ?? []).map((item, i) => (
                                      <li key={i} className="leading-relaxed">
                                        · {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {(exp.achievements ?? []).length > 0 && (
                                <div className="space-y-2.5">
                                  <h4 className="text-xs font-medium text-blue-600 dark:text-blue-400">
                                    Key Outcomes
                                  </h4>
                                  <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                                    {(exp.achievements ?? []).map((item, i) => (
                                      <li key={i} className="leading-relaxed">
                                        · {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>

                            {(exp.imageMediaIds ?? []).length > 0 && (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                {(exp.imageMediaIds ?? []).map((mId) => (
                                  <div
                                    key={mId}
                                    className="aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800"
                                  >
                                    <MediaImage
                                      mediaId={mId}
                                      fallbackTitle={exp.companyName}
                                      className="w-full h-full"
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
