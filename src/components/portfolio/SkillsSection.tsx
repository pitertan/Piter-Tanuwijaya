import React, { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  Box,
  CircuitBoard,
  Code2,
  Cpu,
  Gauge,
  Network,
  ShieldCheck,
  Terminal,
  Wrench,
} from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import type { PortfolioSection, SkillItem } from '../../types/portfolio';
import { MediaImage } from '../common/MediaImage';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Cpu,
  Terminal,
  Code2,
  Box,
  CircuitBoard,
  Gauge,
  ShieldCheck,
  Network,
  Wrench,
};

export function SkillsSection({ section }: { section: PortfolioSection }) {
  const { data } = usePortfolio();
  const visibleCategories = data.skillCategories.filter((c) => c.isVisible);
  const publishedSkills = data.skills.filter((s) => s.isPublished);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);

  const filteredSkills = useMemo(() => {
    if (selectedCategory === 'all') return publishedSkills;
    return publishedSkills.filter((s) => s.categoryId === selectedCategory);
  }, [publishedSkills, selectedCategory]);

  const activeSkill: SkillItem | undefined =
    filteredSkills.find((s) => s.id === activeSkillId) || filteredSkills[0];

  const categoryNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cat of visibleCategories) {
      map.set(cat.id, cat.name);
    }
    return map;
  }, [visibleCategories]);

  return (
    <section
      id="skills"
      className="py-20 lg:py-28 border-b border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-[#090C12]"
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

          {/* Interactive category filter */}
          <div
            role="tablist"
            aria-label="Filter skills by category"
            className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-[#0F131A] border border-slate-200 dark:border-slate-800"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'all'}
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              All Domains
            </button>
            {visibleCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={selectedCategory === cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-white dark:bg-slate-800 text-slate-950 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive capability matrix + focused specification panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredSkills.map((skill, idx) => {
              const Icon = ICON_MAP[skill.iconName] || Cpu;
              const isSelected = activeSkill?.id === skill.id;
              return (
                <motion.button
                  key={skill.id}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.35, delay: idx * 0.03 }}
                  onClick={() => setActiveSkillId(skill.id)}
                  className={`text-left p-5 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-blue-600 dark:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#0F131A] hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {skill.iconMediaId ? (
                        <div className="w-9 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0">
                          <MediaImage
                            mediaId={skill.iconMediaId}
                            useThumbnail
                            fallbackTitle={skill.name}
                            className="w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="text-sm font-display font-semibold text-slate-950 dark:text-white truncate">
                          {skill.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {categoryNameMap.get(skill.categoryId) || 'Engineering'}
                        </p>
                      </div>
                    </div>

                    <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                      {skill.yearsExperience}y
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                    {skill.description}
                  </p>
                </motion.button>
              );
            })}
          </div>

          {/* Focused capability dossier */}
          <div className="lg:col-span-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0F131A] p-6 sm:p-7 space-y-6 lg:sticky lg:top-24">
            {activeSkill ? (
              <>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {categoryNameMap.get(activeSkill.categoryId) || 'Technical Focus'}
                  </p>
                  <h3 className="text-xl font-display font-bold text-slate-950 dark:text-white">
                    {activeSkill.name}
                  </h3>
                </div>

                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {activeSkill.description}
                </p>

                <dl className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">
                      Depth Tier
                    </dt>
                    <dd className="text-sm font-display font-semibold text-slate-900 dark:text-white mt-0.5">
                      {activeSkill.proficiencyLevel}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500 dark:text-slate-400">
                      Applied Practice
                    </dt>
                    <dd className="text-sm font-mono font-semibold tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {activeSkill.yearsExperience} Years
                    </dd>
                  </div>
                </dl>
              </>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No published skills match the selected category.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
