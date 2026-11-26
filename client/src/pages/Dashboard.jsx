import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarClock,
  Handshake,
  History,
  Mail,
  Phone,
  Plus,
  Sparkles,
  Tag,
  TrendingDown,
  TrendingUp,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { contactsApi, dashboardApi } from '../api/endpoints';
import { Avatar, ErrorBanner, Spinner, StatCard } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { followUpState, fullName, relativeDay } from '../utils/format';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TYPE_ICONS = { call: Phone, email: Mail, meeting: Handshake };
const STATE_STYLE = {
  overdue: 'bg-red-100 text-red-700',
  today: 'bg-amber-100 text-amber-800',
  upcoming: 'bg-emerald-100 text-emerald-700',
};

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function SectionTitle({ icon: Icon, children, action }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 font-bold">
        <span className="flex size-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon size={15} strokeWidth={2.3} />
        </span>
        {children}
      </h2>
      {action}
    </div>
  );
}

/** Column chart drawn with divs; each bar grows up from the bottom, one after another. */
function BarChart({ rows }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <div className="flex h-52 items-end gap-3 border-b border-rule pb-1">
      {rows.map((row, i) => (
        <div key={row.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
          <span className="rounded-md bg-navy px-1.5 py-0.5 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">{row.value}</span>
          <div
            className="grow-y w-full max-w-14 rounded-t-xl bg-gradient-to-t from-brand-600 to-brand-400 shadow-[0_8px_20px_-10px_rgb(47_91_211/0.8)] transition group-hover:from-brand-700 group-hover:to-brand-500"
            style={{ height: `${Math.max((row.value / max) * 150, 6)}px`, animationDelay: `${i * 80}ms` }}
          />
          <span className="text-xs font-semibold text-muted">{row.label}</span>
        </div>
      ))}
    </div>
  );
}

function HorizontalBars({ rows, empty, color = 'from-brand-500 to-brand-400' }) {
  if (rows.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  const max = Math.max(...rows.map((row) => row.value));
  return (
    <ul className="flex flex-col gap-3.5">
      {rows.map((row, i) => (
        <li key={row.label}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 font-semibold capitalize">
              {row.icon && <row.icon size={14} className="text-muted" />}
              {row.label}
            </span>
            <span className="font-bold text-muted tabular-nums">{row.value}</span>
          </div>
          <div className="h-2 rounded-full bg-brand-50">
            <div
              className={`grow-x h-2 rounded-full bg-gradient-to-r ${color}`}
              style={{ width: `${(row.value / max) * 100}%`, animationDelay: `${i * 90}ms` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const summary = useApi(() => dashboardApi.summary(), []);
  const recent = useApi(() => contactsApi.recent(), []);

  if (summary.loading && !summary.data) return <Spinner label="Loading your dashboard…" />;
  if (summary.error) return <ErrorBanner error={summary.error} onRetry={summary.reload} />;

  const { totals, contactsByMonth, topTags, topCompanies, interactionsByType, nextFollowUps } = summary.data;
  const change = totals.addedThisMonth - totals.addedLastMonth;
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="stagger flex flex-col gap-6">
      {/* Greeting */}
      <section className="card relative overflow-hidden p-6 sm:p-8">
        <div className="absolute -top-16 -right-10 size-56 rounded-full bg-brand-200/60 blur-3xl" />
        <div className="absolute -bottom-20 left-1/3 size-48 rounded-full bg-amber-100/80 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-600">
              <Sparkles size={15} /> {greeting()}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
              Welcome back,{' '}
              <span className="bg-gradient-to-r from-brand-600 via-brand-500 to-violet-500 bg-clip-text text-transparent">{firstName}</span>
            </h1>
            <p className="mt-2 text-sm text-muted">
              {totals.followUpsDue > 0
                ? `You have ${totals.followUpsDue} follow-up${totals.followUpsDue === 1 ? '' : 's'} waiting today.`
                : 'You are all caught up. Nice work!'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/followups" className="btn btn-secondary">
              <BellRing size={16} /> Follow-ups
            </Link>
            <Link to="/contacts" className="btn btn-primary">
              <Plus size={16} /> Add contact
            </Link>
          </div>
        </div>
      </section>

      {/* Numbers */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={UsersRound} label="Total contacts" value={totals.contacts} hint={`${totals.favourites} favourites · ${totals.inTrash} in trash`} />
        <StatCard
          icon={UserPlus}
          tone="green"
          label="Added this month"
          value={totals.addedThisMonth}
          hint={
            <span className="inline-flex items-center gap-1">
              {change >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {change >= 0 ? '+' : ''}
              {change} vs last month
            </span>
          }
          hintTone={change >= 0 ? 'text-emerald-600' : 'text-red-600'}
        />
        <StatCard icon={BellRing} tone="red" label="Follow-ups due" value={totals.followUpsDue} hint="Overdue or due today" />
        <StatCard icon={CalendarClock} tone="amber" label="Coming up" value={totals.followUpsUpcoming} hint="In the next 7 days" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card p-6 lg:col-span-2">
          <SectionTitle icon={TrendingUp}>Contacts added per month</SectionTitle>
          <BarChart rows={contactsByMonth.map((row) => ({ label: MONTH_NAMES[Number(row.month.slice(5)) - 1], value: row.count }))} />
        </section>

        <section className="card flex flex-col p-6">
          <SectionTitle icon={CalendarClock}>Next follow-ups</SectionTitle>
          {nextFollowUps.length === 0 ? (
            <p className="text-sm text-muted">Nothing pending. 🎉</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {nextFollowUps.map((item) => {
                const Icon = TYPE_ICONS[item.type];
                return (
                  <li key={item.id}>
                    <Link to={`/contacts/${item.contactId}`} className="flex items-center gap-3 rounded-xl p-2 transition hover:translate-x-1 hover:bg-brand-50/70">
                      <Avatar contact={item.contact} size="size-9" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{fullName(item.contact)}</p>
                        <p className="flex items-center gap-1 truncate text-xs text-muted">
                          <Icon size={12} /> {item.note}
                        </p>
                      </div>
                      <span className={`chip shrink-0 ${STATE_STYLE[followUpState(item.followUpDate)]}`}>{relativeDay(item.followUpDate)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link to="/followups" className="group mt-auto inline-flex items-center gap-1 pt-4 text-sm font-semibold text-brand-600">
            All follow-ups <ArrowRight size={15} className="transition group-hover:translate-x-1" />
          </Link>
        </section>

        <section className="card spot p-6">
          <SectionTitle icon={Tag}>Top tags</SectionTitle>
          <HorizontalBars rows={topTags.map((row) => ({ label: `#${row.tag}`, value: row.count }))} empty="No tags yet." />
        </section>

        <section className="card spot p-6">
          <SectionTitle icon={Building2}>Top companies</SectionTitle>
          <HorizontalBars
            rows={topCompanies.map((row) => ({ label: row.company, value: row.count }))}
            empty="No companies yet."
            color="from-violet-500 to-violet-400"
          />
        </section>

        <section className="card spot p-6">
          <SectionTitle icon={Handshake}>Interactions by type</SectionTitle>
          <HorizontalBars
            rows={interactionsByType.filter((row) => row.count > 0).map((row) => ({ label: row.type, value: row.count, icon: TYPE_ICONS[row.type] }))}
            empty="No interactions logged yet."
            color="from-emerald-500 to-emerald-400"
          />
        </section>
      </div>

      {recent.data?.length > 0 && (
        <section className="card p-6">
          <SectionTitle icon={History}>Recently viewed</SectionTitle>
          <div className="flex flex-wrap gap-2.5">
            {recent.data.map((contact) => (
              <Link
                key={contact.id}
                to={`/contacts/${contact.id}`}
                className="flex items-center gap-2 rounded-full border border-rule bg-white/80 py-1 pr-4 pl-1 text-sm font-semibold transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
              >
                <Avatar contact={contact} size="size-8" />
                {fullName(contact)}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
