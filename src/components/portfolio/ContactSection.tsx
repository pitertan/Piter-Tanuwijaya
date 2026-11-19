import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, CheckCircle2, Mail, MapPin, Phone, Send } from 'lucide-react';
import { usePortfolio } from '../../context/PortfolioContext';
import { useToast } from '../../context/ToastContext';
import { validateContactForm, type ContactFormInput } from '../../lib/validation';
import type { PortfolioSection } from '../../types/portfolio';
import { MagneticButton } from './MagneticButton';

export function ContactSection({ section }: { section: PortfolioSection }) {
  const { data, submitContactMessage } = usePortfolio();
  const { showToast } = useToast();
  const { contactInfo, socialLinks } = data;

  const [form, setForm] = useState<ContactFormInput>({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormInput, string>>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const visibleSocials = socialLinks.filter((s) => s.isVisible);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateContactForm(form);
    if (!validation.valid || !validation.data) {
      setErrors(validation.errors);
      showToast('Please review the form fields.', 'error');
      return;
    }

    setErrors({});
    setSubmitting(true);
    try {
      await submitContactMessage(validation.data);
      setSubmitted(true);
      setForm({ name: '', email: '', subject: '', message: '' });
      showToast('Inquiry transmitted', 'success', 'Your message has been logged.');
    } catch {
      showToast('Unable to send message', 'error', 'Please try again shortly.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      id="contact"
      className="py-20 lg:py-28 bg-slate-50 dark:bg-[#07090D]"
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Left Column: Direct Channels */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-2">
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

            <div className="space-y-4 pt-2">
              <a
                href={`mailto:${contactInfo.email}`}
                className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] hover:border-blue-500/50 transition-colors"
              >
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Email</p>
                  <p className="text-sm font-medium text-slate-950 dark:text-white truncate">
                    {contactInfo.email}
                  </p>
                </div>
              </a>

              {contactInfo.phone && (
                <div className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A]">
                  <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Phone</p>
                    <p className="text-sm font-mono text-slate-950 dark:text-white tabular-nums">
                      {contactInfo.phone}
                    </p>
                  </div>
                </div>
              )}

              {contactInfo.location && (
                <div className="flex items-center gap-3.5 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A]">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Base</p>
                    <p className="text-sm font-medium text-slate-950 dark:text-white">
                      {contactInfo.location}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {visibleSocials.length > 0 && (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  External Profiles
                </p>
                <div className="flex flex-wrap gap-3">
                  {visibleSocials.map((soc) => (
                    <a
                      key={soc.id}
                      href={soc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-blue-500/60 transition-colors"
                    >
                      <span>{soc.platform}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Validated Contact Form */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45 }}
            className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F131A] p-6 sm:p-8"
          >
            <div className="mb-6 space-y-1">
              <h3 className="text-xl font-display font-semibold text-slate-950 dark:text-white">
                {contactInfo.formHeading || 'Send a Message'}
              </h3>
              {contactInfo.responseExpectation && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {contactInfo.responseExpectation}
                </p>
              )}
            </div>

            {submitted ? (
              <div className="py-10 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-display font-semibold text-slate-950 dark:text-white">
                    Message Received
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    Thank you for reaching out. Your inquiry has been stored securely and will be reviewed shortly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Send Another Message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} noValidate className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-name"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Name
                    </label>
                    <input
                      id="contact-name"
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Elena Rostova"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.name && (
                      <p role="alert" className="text-xs text-rose-500">{errors.name}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="contact-email"
                      className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                    >
                      Email
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="elena@organization.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {errors.email && (
                      <p role="alert" className="text-xs text-rose-500">{errors.email}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-subject"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Subject
                  </label>
                  <input
                    id="contact-subject"
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder="Advisory or systems architecture inquiry"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.subject && (
                    <p role="alert" className="text-xs text-rose-500">{errors.subject}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="contact-message"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    required
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Share your timeline, technical context, or project goals..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#090C12] text-sm text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                  />
                  {errors.message && (
                    <p role="alert" className="text-xs text-rose-500">{errors.message}</p>
                  )}
                </div>

                <div className="pt-1">
                  <MagneticButton
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>{submitting ? 'Sending...' : 'Send Message'}</span>
                  </MagneticButton>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
