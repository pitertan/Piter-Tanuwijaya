import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Award, BadgeCheck, ExternalLink } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import type { PortfolioSection } from '../../types/portfolio';
import { MediaImage } from '../common/MediaImage';

export function AchievementsSection({ section }: { section: PortfolioSection }) {
  const { data } = usePortfolio();
  const achievements = data.achievements.filter((a) => a.isPublished);
  const certifications = data.certifications.filter((c) => c.isPublished);

  const [tab, setTab] = useState<'all' | 'achievements' | 'certifications'>('all');

  const showAchievements = tab === 'all' || tab === 'achievements';
  const showCerts = tab === 'all' || tab === 'certifications';

  return (
    <section
      id="achievements"
      className="py-20 lg:py-28 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50 dark:bg-[#07090D]"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
          <div className="max-w-2xl space-y-2">
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

          <div
            role="tablist"
            aria-label="Filter honors and credentials"
            className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-[#0F131A] border border-slate-200 dark:border-slate-800 w-fit"
          >
            {[
              { id: 'all', label: 'All Credentials' },
              { id: 'achievements', label: 'Achievements' },
              { id: 'certifications', label: 'Certifications' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={tab === item.id}
                onClick={() =>
                  setTab(item.id as 'all' | 'achievements' | 'certifications')
                }
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  tab === item.id
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showAchievements &&
            achievements.map((ach, idx) => (
              <motion.article
                key={ach.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: idx * 0.04 }}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 flex flex-col justify-between gap-5"
              >
                <div className="flex items-start gap-4">
                  {ach.mediaId ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                      <MediaImage
                        mediaId={ach.mediaId}
                        useThumbnail
                        fallbackTitle={ach.title}
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Award className="w-5 h-5" />
                    </div>
                  )}

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        Achievement
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{ach.issueDate}</span>
                    </div>
                    <h3 className="text-lg font-display font-semibold text-slate-950 dark:text-white leading-snug">
                      {ach.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {ach.organization}
                    </p>
                  </div>
                </div>

                {ach.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {ach.description}
                  </p>
                )}

                {ach.verificationUrl && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <a
                      href={ach.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>Verify Record</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </motion.article>
            ))}

          {showCerts &&
            certifications.map((cert, idx) => (
              <motion.article
                key={cert.id}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: idx * 0.04 }}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 flex flex-col justify-between gap-5"
              >
                <div className="flex items-start gap-4">
                  {cert.mediaId ? (
                    <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                      <MediaImage
                        mediaId={cert.mediaId}
                        useThumbnail
                        fallbackTitle={cert.title}
                        className="w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <BadgeCheck className="w-5 h-5" />
                    </div>
                  )}

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        Certification
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{cert.issueDate}</span>
                      {cert.credentialId && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{cert.credentialId}</span>
                        </>
                      )}
                    </div>
                    <h3 className="text-lg font-display font-semibold text-slate-950 dark:text-white leading-snug">
                      {cert.title}
                    </h3>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      {cert.organization}
                    </p>
                  </div>
                </div>

                {cert.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {cert.description}
                  </p>
                )}

                {cert.verificationUrl && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <a
                      href={cert.verificationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>Verify Credential</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </motion.article>
            ))}
        </div>
      </div>
    </section>
  );
}
