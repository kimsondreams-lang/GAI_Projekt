import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, RefreshCw, UploadCloud } from 'lucide-react';

type AnalyticsReport = {
  siteId: string;
  range: { from: string; to: string };
  counts: {
    events: number;
    pageviews: number;
    clicks: number;
    outboundClicks: number;
    affiliateClicks: number;
    sessions: number;
    users: number;
  };
  topPages: Array<{ path: string; pageviews: number; sessions: number; outboundClicks: number }>;
  topReferrers: Array<{ ref: string; count: number }>;
  topOutbound: Array<{ url: string; count: number }>;
  topLinks: Array<{ url: string; count: number }>;
  topAffiliates: Array<{ url: string; count: number }>;
  topArticles: Array<{ id: string; title: string; views: number; clicks: number; outboundClicks: number; affiliateClicks: number }>;
  sources: {
    channels: Array<{ label: string; count: number }>;
    sources: Array<{ source: string; count: number }>;
    utmSources: Array<{ source: string; count: number }>;
    utmCampaigns: Array<{ campaign: string; count: number }>;
  };
  geo: {
    continents: Array<{ name: string; count: number }>;
    countries: Array<{ name: string; count: number }>;
    regions: Array<{ name: string; count: number }>;
    cities: Array<{ name: string; count: number }>;
  };
  timeline: Array<{ day: string; pageviews: number; sessions: number; clicks: number; outboundClicks: number; affiliateClicks: number; users: number }>;
  recentEvents: Array<{ ts: number; type: string; path?: string; href?: string; ref?: string; linkType?: string; affiliate?: boolean; country?: string; source?: string }>;
  gsc?: {
    days: number;
    rows: Array<{ date: string; query: string; page: string; clicks: number; impressions: number; ctr: number; position: number }>;
    topQueries: Array<{ query: string; clicks: number; impressions: number; ctr: number; position: number }>;
    topPages: Array<{ page: string; clicks: number; impressions: number; ctr: number; position: number }>;
  };
};

const Metric = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="bg-neu-base shadow-neu-flat rounded-xl p-4 border border-white/5">
    <div className="text-xs text-neu-muted font-semibold tracking-wide">{label}</div>
    <div className="text-2xl font-extrabold text-neu-text mt-1">{value}</div>
  </div>
);

const Table = ({
  title,
  headers,
  rows
}: {
  title: string;
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
}) => (
  <div className="bg-neu-base shadow-neu-flat rounded-xl border border-white/5 overflow-hidden">
    <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
      <div className="font-bold text-neu-text text-sm">{title}</div>
    </div>
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead className="bg-black/10">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left px-4 py-2 text-neu-muted font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, idx) => (
              <tr key={idx} className="border-t border-white/5">
                {r.map((c, j) => (
                  <td key={j} className="px-4 py-2 text-neu-text align-top">
                    {c}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="px-4 py-3 text-neu-muted" colSpan={headers.length}>
                Brak danych
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const BarSeries = ({
  title,
  data,
  colorClass = 'bg-cyan-500/70'
}: {
  title: string;
  data: Array<{ label: string; value: number }>;
  colorClass?: string;
}) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bg-neu-base shadow-neu-flat rounded-xl border border-white/5 p-4">
      <div className="font-bold text-neu-text text-sm mb-3">{title}</div>
      <div className="flex items-end gap-1 h-28">
        {data.map((d, idx) => (
          <div key={`${d.label}-${idx}`} className="flex-1 flex flex-col items-center h-full">
            <div className="w-full flex-1 flex items-end">
              <div className={`w-full rounded ${colorClass}`} style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }} />
            </div>
            <div className="text-[10px] text-neu-muted mt-1">{d.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SEOAnalytics: React.FC = () => {
  const [siteId, setSiteId] = useState('technova');
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<AnalyticsReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'traffic' | 'content' | 'events' | 'gsc'>('overview');
  const [gscJson, setGscJson] = useState('');
  const [gscImportStatus, setGscImportStatus] = useState<string | null>(null);

  const fetchReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics/report?siteId=${encodeURIComponent(siteId)}&days=${encodeURIComponent(String(days))}`);
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Nie udało się pobrać raportu');
      const json = await res.json();
      setReport(json);
    } catch (e: any) {
      setError(e?.message || 'Błąd');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const overviewTables = useMemo(() => {
    if (!report) return null;
    return {
      topPages: report.topPages.map((p) => [p.path, p.pageviews, p.sessions, p.outboundClicks]),
      topRef: report.topReferrers.map((r) => [r.ref || '(direct)', r.count]),
      topOut: report.topOutbound.map((o) => [o.url, o.count]),
      topArticles: report.topArticles.map((a) => [a.title || a.id, a.views, a.clicks, a.affiliateClicks]),
      topAffiliates: report.topAffiliates.map((o) => [o.url, o.count]),
      topLinks: report.topLinks.map((o) => [o.url, o.count]),
      channels: report.sources.channels.map((c) => [c.label, c.count]),
      sources: report.sources.sources.map((s) => [s.source, s.count]),
      utmSources: report.sources.utmSources.map((s) => [s.source, s.count]),
      utmCampaigns: report.sources.utmCampaigns.map((s) => [s.campaign, s.count]),
      continents: report.geo.continents.map((g) => [g.name, g.count]),
      countries: report.geo.countries.map((g) => [g.name, g.count]),
      regions: report.geo.regions.map((g) => [g.name, g.count]),
      cities: report.geo.cities.map((g) => [g.name, g.count])
    };
  }, [report]);

  const timelineCharts = useMemo(() => {
    if (!report) return null;
    const base = report.timeline.map((d) => ({
      label: d.day.slice(5),
      pageviews: d.pageviews,
      sessions: d.sessions,
      clicks: d.clicks,
      outbound: d.outboundClicks,
      affiliate: d.affiliateClicks,
      users: d.users
    }));
    return {
      pageviews: base.map((d) => ({ label: d.label, value: d.pageviews })),
      sessions: base.map((d) => ({ label: d.label, value: d.sessions })),
      clicks: base.map((d) => ({ label: d.label, value: d.clicks })),
      outbound: base.map((d) => ({ label: d.label, value: d.outbound })),
      affiliate: base.map((d) => ({ label: d.label, value: d.affiliate })),
      users: base.map((d) => ({ label: d.label, value: d.users }))
    };
  }, [report]);

  const importGsc = async () => {
    setGscImportStatus(null);
    let payload: any;
    try {
      payload = JSON.parse(gscJson || '{}');
    } catch {
      setGscImportStatus('Niepoprawny JSON');
      return;
    }
    try {
      const res = await fetch('/api/analytics/gsc/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, ...payload })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || 'Import nieudany');
      setGscImportStatus('Zaimportowano');
      await fetchReport();
    } catch (e: any) {
      setGscImportStatus(e?.message || 'Błąd importu');
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-neu-base">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-cyan-400" />
          <div className="font-extrabold text-neu-text">SEO Analytics</div>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={siteId}
            onChange={(e) => setSiteId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-neu-text text-sm w-40"
            placeholder="siteId"
          />
          <input
            type="number"
            value={days}
            onChange={(e) => setDays(Math.max(1, Math.min(365, Number(e.target.value) || 7)))}
            className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-neu-text text-sm w-24"
            min={1}
            max={365}
          />
          <button
            onClick={fetchReport}
            className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-neu-text text-sm flex items-center gap-2 hover:bg-black/30"
            disabled={loading}
            title="Odśwież"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Odśwież
          </button>
        </div>
      </div>

      <div className="px-4 py-3 flex gap-2">
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'traffic', label: 'Traffic' },
          { id: 'content', label: 'Content' },
          { id: 'events', label: 'Events' },
          { id: 'gsc', label: 'GSC' }
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-3 py-2 rounded-lg text-sm font-bold border ${
              activeTab === t.id ? 'bg-black/30 border-cyan-400 text-cyan-200' : 'bg-black/10 border-white/10 text-neu-muted hover:bg-black/20'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto px-4 pb-4">
        {error ? <div className="text-red-300 text-sm mb-3">{error}</div> : null}

        {report && activeTab === 'overview' ? (
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-3">
            <Metric label="Pageviews" value={report.counts.pageviews} />
            <Metric label="Sessions" value={report.counts.sessions} />
            <Metric label="Users" value={report.counts.users} />
            <Metric label="Clicks" value={report.counts.clicks} />
            <Metric label="Outbound" value={report.counts.outboundClicks} />
            <Metric label="Affiliate" value={report.counts.affiliateClicks} />
            <Metric label="Events" value={report.counts.events} />

            <div className="lg:col-span-4">
              <Table
                title="Top Pages"
                headers={['Path', 'PV', 'Sessions', 'Outbound']}
                rows={overviewTables?.topPages.map((r) => [<span className="font-mono text-xs">{r[0]}</span>, r[1], r[2], r[3]]) || []}
              />
            </div>
            <div className="lg:col-span-3 grid grid-cols-1 gap-3">
              <Table
                title="Top Referrers"
                headers={['Ref', 'Count']}
                rows={overviewTables?.topRef.map((r) => [<span className="font-mono text-xs break-all">{r[0] as any}</span>, r[1]]) || []}
              />
              <Table
                title="Top Outbound"
                headers={['URL', 'Count']}
                rows={overviewTables?.topOut.map((r) => [<span className="font-mono text-xs break-all">{r[0] as any}</span>, r[1]]) || []}
              />
            </div>
          </div>
        ) : null}

        {report && activeTab === 'traffic' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <BarSeries title="Pageviews" data={timelineCharts?.pageviews || []} />
            <BarSeries title="Sessions" data={timelineCharts?.sessions || []} colorClass="bg-emerald-500/70" />
            <BarSeries title="Users" data={timelineCharts?.users || []} colorClass="bg-indigo-500/70" />
            <BarSeries title="Clicks" data={timelineCharts?.clicks || []} colorClass="bg-orange-500/70" />
            <BarSeries title="Outbound" data={timelineCharts?.outbound || []} colorClass="bg-pink-500/70" />
            <BarSeries title="Affiliate" data={timelineCharts?.affiliate || []} colorClass="bg-fuchsia-500/70" />

            <Table title="Channels" headers={['Channel', 'Count']} rows={overviewTables?.channels.map((r) => [r[0], r[1]]) || []} />
            <Table title="Sources" headers={['Source', 'Count']} rows={overviewTables?.sources.map((r) => [r[0], r[1]]) || []} />
            <Table title="UTM Sources" headers={['Source', 'Count']} rows={overviewTables?.utmSources.map((r) => [r[0], r[1]]) || []} />
            <Table title="UTM Campaigns" headers={['Campaign', 'Count']} rows={overviewTables?.utmCampaigns.map((r) => [r[0], r[1]]) || []} />
            <Table title="Continents" headers={['Continent', 'Count']} rows={overviewTables?.continents.map((r) => [r[0], r[1]]) || []} />
            <Table title="Countries" headers={['Country', 'Count']} rows={overviewTables?.countries.map((r) => [r[0], r[1]]) || []} />
            <Table title="Regions" headers={['Region', 'Count']} rows={overviewTables?.regions.map((r) => [r[0], r[1]]) || []} />
            <Table title="Cities" headers={['City', 'Count']} rows={overviewTables?.cities.map((r) => [r[0], r[1]]) || []} />
          </div>
        ) : null}

        {report && activeTab === 'content' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Table
              title="Top Articles"
              headers={['Title', 'Views', 'Clicks', 'Affiliate']}
              rows={overviewTables?.topArticles.map((r) => [<span className="font-mono text-xs break-all">{r[0] as any}</span>, r[1], r[2], r[3]]) || []}
            />
            <Table
              title="Top Links"
              headers={['URL', 'Count']}
              rows={overviewTables?.topLinks.map((r) => [<span className="font-mono text-xs break-all">{r[0] as any}</span>, r[1]]) || []}
            />
            <Table
              title="Top Affiliate Links"
              headers={['URL', 'Count']}
              rows={overviewTables?.topAffiliates.map((r) => [<span className="font-mono text-xs break-all">{r[0] as any}</span>, r[1]]) || []}
            />
          </div>
        ) : null}

        {report && activeTab === 'events' ? (
          <div className="grid grid-cols-1 gap-3">
            <Table
              title="Recent Events"
              headers={['Time', 'Type', 'Path', 'Href', 'Source', 'Country']}
              rows={report.recentEvents.map((e) => [
                new Date(e.ts).toLocaleString(),
                <span className="font-mono text-xs">{e.type}</span>,
                <span className="font-mono text-xs break-all">{e.path || ''}</span>,
                <span className="font-mono text-xs break-all">{e.href || ''}</span>,
                <span className="font-mono text-xs break-all">{e.source || e.ref || ''}</span>,
                <span className="font-mono text-xs break-all">{e.country || ''}</span>
              ])}
            />
          </div>
        ) : null}

        {activeTab === 'gsc' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="bg-neu-base shadow-neu-flat rounded-xl border border-white/5 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="font-bold text-neu-text text-sm">Import z Google Search Console (lokalny)</div>
                <button
                  onClick={importGsc}
                  className="px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-neu-text text-sm flex items-center gap-2 hover:bg-black/30"
                  title="Import"
                >
                  <UploadCloud size={16} />
                  Import
                </button>
              </div>
              <div className="text-xs text-neu-muted mb-2">
                Wklej JSON w formacie: {'{'}"rows":[{'{'}"date":"YYYY-MM-DD","query":"...","page":"/...","clicks":1,"impressions":10,"ctr":0.1,"position":12.3{'}'}]{'}'}
              </div>
              <textarea
                value={gscJson}
                onChange={(e) => setGscJson(e.target.value)}
                className="w-full h-64 px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-neu-text text-xs font-mono"
                placeholder='{"rows":[{"date":"2026-02-18","query":"amazon prime day","page":"/","clicks":1,"impressions":10,"ctr":0.1,"position":12.3}]}'
              />
              {gscImportStatus ? <div className="text-sm mt-2 text-neu-text">{gscImportStatus}</div> : null}
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Table
                title="GSC Top Queries"
                headers={['Query', 'Clicks', 'Impr', 'CTR', 'Pos']}
                rows={(report?.gsc?.topQueries || []).slice(0, 20).map((r) => [
                  <span className="font-mono text-xs break-all">{r.query}</span>,
                  r.clicks,
                  r.impressions,
                  `${Math.round((r.ctr || 0) * 1000) / 10}%`,
                  Math.round((r.position || 0) * 10) / 10
                ])}
              />
              <Table
                title="GSC Top Pages"
                headers={['Page', 'Clicks', 'Impr', 'CTR', 'Pos']}
                rows={(report?.gsc?.topPages || []).slice(0, 20).map((r) => [
                  <span className="font-mono text-xs break-all">{r.page}</span>,
                  r.clicks,
                  r.impressions,
                  `${Math.round((r.ctr || 0) * 1000) / 10}%`,
                  Math.round((r.position || 0) * 10) / 10
                ])}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
