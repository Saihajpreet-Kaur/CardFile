import { ArrowRight, CircleCheck, CircleX, Download, FileSpreadsheet, FileUp, Rows3, UploadCloud } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { contactsApi } from '../api/endpoints';
import { PageHeader, ProgressBar } from '../components/ui';
import { useToast } from '../context/ToastContext';

const MAX_BYTES = 2 * 1024 * 1024;
const TEMPLATE = 'First Name,Last Name,Email,Phone,Company,Job Title,Tags,Notes\nAarav,Sharma,aarav@example.com,+919876543210,Infosys,Manager,client; vip,Met at a conference\n';

function downloadTemplate() {
  const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'cardfile-import-template.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function Import() {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const choose = (chosen) => {
    setReport(null);
    setError('');
    if (!chosen) return;
    if (!chosen.name.toLowerCase().endsWith('.csv')) return setError('Choose a .csv file');
    if (chosen.size > MAX_BYTES) return setError('The file must be smaller than 2 MB');
    setFile(chosen);
  };

  const upload = async () => {
    setProgress(0);
    setError('');
    try {
      const result = await contactsApi.importCsv(file, setProgress);
      setReport(result);
      setFile(null);
      toast.success(`Imported ${result.imported} of ${result.totalRows} rows`);
    } catch (err) {
      setError(err.message);
    } finally {
      setProgress(null);
    }
  };

  return (
    <>
      <PageHeader
        icon={FileUp}
        title="Import contacts"
        subtitle="Upload a CSV file (up to 2 MB, 1,000 rows). Each row is checked on its own: good rows are saved, bad rows are listed below."
        actions={
          <button type="button" className="btn btn-secondary" onClick={downloadTemplate}>
            <Download size={16} /> Download template
          </button>
        }
      />

      <label
        className={`card group flex cursor-pointer flex-col items-center gap-2 border-2 border-dashed p-12 text-center transition duration-300 ${
          dragging ? 'scale-[1.01] border-brand-500 bg-brand-50/90' : 'border-brand-200 hover:border-brand-400 hover:bg-white/90'
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          choose(event.dataTransfer.files[0]);
        }}
      >
        <span className={`mb-2 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_12px_28px_-10px_rgb(47_91_211/0.8)] transition duration-300 group-hover:-translate-y-1 ${dragging ? '-translate-y-1 animate-bounce' : ''}`}>
          {file ? <FileSpreadsheet size={28} /> : <UploadCloud size={28} />}
        </span>
        <span className="text-base font-bold">{file ? file.name : 'Drop a CSV file here or click to choose'}</span>
        <span className="text-xs text-muted">Columns like First Name, Email, Phone, Company, Job Title, Tags, Notes</span>
        <input type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => choose(event.target.files[0])} />
      </label>

      {error && <p className="field-error mt-3 text-sm">{error}</p>}

      {file && (
        <div className="mt-4 flex items-center gap-4">
          <button type="button" className="btn btn-primary" onClick={upload} disabled={progress !== null}>
            <UploadCloud size={16} /> {progress !== null ? 'Importing…' : 'Import contacts'}
          </button>
          {progress !== null && (
            <div className="w-64">
              <ProgressBar value={progress} />
            </div>
          )}
        </div>
      )}

      {report && (
        <section className="mt-8">
          <div className="stagger grid gap-4 sm:grid-cols-3">
            <div className="card spot flex items-center gap-4 p-5">
              <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Rows3 size={20} /></span>
              <div>
                <p className="text-sm text-muted">Rows in file</p>
                <p className="text-3xl font-extrabold">{report.totalRows}</p>
              </div>
            </div>
            <div className="card spot flex items-center gap-4 p-5">
              <span className="flex size-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><CircleCheck size={20} /></span>
              <div>
                <p className="text-sm text-muted">Imported</p>
                <p className="text-3xl font-extrabold text-emerald-600">{report.imported}</p>
              </div>
            </div>
            <div className="card spot flex items-center gap-4 p-5">
              <span className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-danger"><CircleX size={20} /></span>
              <div>
                <p className="text-sm text-muted">Skipped</p>
                <p className="text-3xl font-extrabold text-danger">{report.failed}</p>
              </div>
            </div>
          </div>

          {report.errors.length > 0 && (
            <div className="card mt-4 overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-rule/70 bg-white/50">
                  <tr>
                    <th className="th">Line</th>
                    <th className="th">Row</th>
                    <th className="th">Problems</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rule/60">
                  {report.errors.map((row) => (
                    <tr key={row.line}>
                      <td className="td font-mono">{row.line}</td>
                      <td className="td text-muted">{[row.data.firstName, row.data.email, row.data.phone].filter(Boolean).join(' · ') || '(empty)'}</td>
                      <td className="td text-red-700">{row.errors.join('; ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Link to="/contacts" className="btn btn-primary mt-6">
            Go to contacts <ArrowRight size={16} />
          </Link>
        </section>
      )}
    </>
  );
}
