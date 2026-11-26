import { AlarmClock, BellRing, CalendarCheck, CalendarDays, Check, Handshake, ListTodo, Mail, Phone } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { interactionsApi } from '../api/endpoints';
import { Avatar, EmptyState, ErrorBanner, PageHeader, Spinner } from '../components/ui';
import { useToast } from '../context/ToastContext';
import { useApi } from '../hooks/useApi';
import { followUpState, formatDate, fullName, relativeDay } from '../utils/format';

const TABS = [
  { value: 'overdue', label: 'Overdue', icon: AlarmClock },
  { value: 'today', label: 'Today', icon: CalendarCheck },
  { value: 'upcoming', label: 'Next 7 days', icon: CalendarDays },
  { value: 'all', label: 'All pending', icon: ListTodo },
];
const TYPE_ICONS = { call: Phone, email: Mail, meeting: Handshake };
const STYLE = {
  overdue: 'bg-red-100 text-red-700',
  today: 'bg-amber-100 text-amber-800',
  upcoming: 'bg-emerald-100 text-emerald-700',
};

export default function FollowUps() {
  const toast = useToast();
  const [tab, setTab] = useState('all');
  const followUps = useApi(() => interactionsApi.followUps(tab), [tab]);

  const markDone = async (item) => {
    try {
      await interactionsApi.setFollowUpDone(item.contactId, item.id, true);
      followUps.setData((items) => items.filter((other) => other.id !== item.id));
      toast.success(`Follow-up with ${fullName(item.contact)} done`);
    } catch (error) {
      toast.error(error);
    }
  };

  return (
    <>
      <PageHeader icon={BellRing} title="Follow-ups" subtitle="Pending follow-ups from your interaction log. Mark them done when you have followed up." />

      <div className="mb-5 inline-flex flex-wrap gap-1 rounded-2xl border border-white/70 bg-white/60 p-1.5 backdrop-blur" role="tablist">
        {TABS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition ${
              tab === value ? 'bg-brand-600 text-white shadow-[0_6px_16px_-6px_rgb(47_91_211/0.8)]' : 'text-muted hover:bg-white hover:text-ink'
            }`}
            onClick={() => setTab(value)}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      <ErrorBanner error={followUps.error} onRetry={followUps.reload} />

      <div className="card divide-y divide-rule/60 overflow-hidden">
        {followUps.loading && !followUps.data && <Spinner />}
        {followUps.data?.length === 0 && <EmptyState icon={CalendarCheck} title="All clear" message="No pending follow-ups in this view." />}
        {followUps.data?.map((item) => {
          const state = followUpState(item.followUpDate);
          const TypeIcon = TYPE_ICONS[item.type];
          return (
            <div key={item.id} className="row-hover flex animate-rise flex-wrap items-center gap-4 p-4">
              <Avatar contact={item.contact} />
              <div className="min-w-0 flex-1">
                <Link to={`/contacts/${item.contactId}`} className="font-semibold hover:text-brand-600">
                  {fullName(item.contact)}
                </Link>
                {item.contact.company && <span className="text-sm text-muted"> · {item.contact.company}</span>}
                <p className="flex items-center gap-1.5 truncate text-sm text-muted">
                  <TypeIcon size={14} className="shrink-0" /> {item.note}
                </p>
              </div>
              <div className="text-right">
                <span className={`chip ${STYLE[state]}`}>{relativeDay(item.followUpDate)}</span>
                <p className="mt-1 text-xs text-faint">{formatDate(item.followUpDate)}</p>
              </div>
              <button type="button" className="btn btn-secondary" onClick={() => markDone(item)}>
                <Check size={15} /> Done
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
