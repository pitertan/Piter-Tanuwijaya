import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import type { PortfolioSection, ProjectItem } from '../../types/portfolio';
import { MediaImage } from '../common/MediaImage';
import { ProjectDetailModal } from './ProjectDetailModal';

export function ProjectsSection({ section }: { section: PortfolioSection }) {
  const { data } = usePortfolio();
  const projects = data.projects.filter((p) => p.isPublished);

  const categories = useMemo(() => {
    const unique = Array.from(new Set(projects.map((p) => p.category)));
    return ['All', ...unique];
  }, [projects]);

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (selectedCategory === 'All') return projects;
    return projects.filter((p) => p.category === selectedCategory);
  }, [projects, selectedCategory]);

  const activeProjectIndex = filtered.findIndex((p) => p.id === selectedProjectId);
  const activeProject: ProjectItem | null =
    activeProjectIndex >= 0 ? filtered[activeProjectIndex] : null;

  const isBento = section.layoutStyle === 'bento';

  return (
    <section
      id="projects"
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
            aria-label="Filter projects by category"
            className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-[#0F131A] border border-slate-200 dark:border-slate-800"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No published projects in this category yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
            {filtered.map((project, idx) => {
              const spanClass =
                isBento && idx === 0
                  ? 'lg:col-span-7'
                  : isBento && idx === 1
                  ? 'lg:col-span-5'
                  : 'lg:col-span-6';

              return (
                <motion.article
                  key={project.id}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.15 }}
                  transition={{ duration: 0.45, delay: idx * 0.05 }}
                  className={`group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] overflow-hidden flex flex-col justify-between ${spanClass}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedProjectId(project.id)}
                    aria-label={`Open case study for ${project.title}`}
                    className="text-left flex flex-col h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
                      <MediaImage
                        mediaId={project.coverMediaId}
                        fallbackTitle={project.title}
                        className="w-full h-full"
                        imgClassName="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                      />
                    </div>

                    <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-5">
                      <div className="space-y-2.5">
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                          <span className="text-blue-600 dark:text-blue-400 font-medium">
                            {project.category}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">
                            {project.projectDate}
                          </span>
                          {project.isFeatured && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span>Featured</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-start justify-between gap-4">
                          <h3 className="text-xl font-display font-semibold text-slate-950 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {project.title}
                          </h3>
                          <ArrowUpRight className="w-5 h-5 text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
                        </div>

                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                          {project.summary}
                        </p>
                      </div>

                      <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
                        <span className="font-mono truncate">
                          {(project.technologies ?? []).slice(0, 4).join(' · ')}
                        </span>
                        <span className="shrink-0 font-medium text-slate-700 dark:text-slate-300">
                          View Case Study
                        </span>
                      </div>
                    </div>
                  </button>
                </motion.article>
              );
            })}
          </div>
        )}
      </div>

      <ProjectDetailModal
        project={activeProject}
        onClose={() => setSelectedProjectId(null)}
        hasMultipleProjects={filtered.length > 1}
        onPrevProject={() => {
          if (filtered.length <= 1) return;
          const prevIdx =
            (activeProjectIndex - 1 + filtered.length) % filtered.length;
          setSelectedProjectId(filtered[prevIdx].id);
        }}
        onNextProject={() => {
          if (filtered.length <= 1) return;
          const nextIdx = (activeProjectIndex + 1) % filtered.length;
          setSelectedProjectId(filtered[nextIdx].id);
        }}
      />
    </section>
  );
}
