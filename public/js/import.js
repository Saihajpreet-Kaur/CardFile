
import { $, esc, formatBytes, icon, notifyDataChanged, withBusy } from './shared.js';
import { api } from './core.js';
import { mountPage, toast, toastError } from './ui.js';

const MAX_BYTES = 2 * 1024 * 1024;

const TEMPLATE_CSV = [
  'First Name,Last Name,Email,Phone,Company,Designation,Tags,Notes',
  'Riya,Sharma,riya.sharma@example.com,+91 98765 43210,Northwind Traders,Product Manager,client;vip,Met at the Pune meetup',
  'Arjun,Mehta,,+91 91234 56789,Contoso,Founder,lead,',
].join('\n');

function steps(current) {
  const step = (number, label) => {
    const done = number < current;
    const active = number === current;
    return `
      <li class="flex items-center gap-2.5">
        <span class="grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
          active ? 'bg-ink text-paper' : done ? 'bg-leaf text-white' : 'bg-well text-faint'
        }">${done ? icon('check', { size: 14, strokeWidth: 3 }) : number}</span>
        <span class="text-sm font-semibold ${active || done ? 'text-ink' : 'text-faint'}">${label}</span>
      </li>`;
  };

  return `
    <ol class="flex items-center gap-3">
      ${step(1, 'Choose file')}
      <li class="h-px w-10 bg-rule" aria-hidden="true"></li>
      ${step(2, 'Results')}
    </ol>`;
}

function dropzone() {
  return `
    <label class="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-rule bg-card px-6 py-14 text-center transition-colors hover:border-accent/50" data-dropzone>
      <span class="grid h-14 w-14 place-items-center rounded-xl bg-accent/10 text-accent">${icon('cloudUpload', { size: 26 })}</span>
      <span class="mt-4 text-lg font-bold">Drop a CSV here or <span class="text-accent">browse</span></span>
      <span class="mt-2 max-w-md text-sm leading-relaxed text-muted">
        <b class="font-semibold text-ink">First name</b> and an email or phone are required. Last name, company,
        designation, tags and notes are picked up automatically.
      </span>
      <span class="mt-3 text-xs text-faint">.csv only · up to 2 MB and 1,000 rows</span>
      <input type="file" accept=".csv,text/csv" class="hidden" data-file-input />
    </label>`;
}

function selectedFile(file) {
  return `
    <div class="panel flex items-center gap-4 p-4">
      <span class="grid h-11 w-11 place-items-center rounded-lg bg-leaf/10 text-leaf">${icon('fileText', { size: 20 })}</span>
      <div class="min-w-0 flex-1">
        <p class="truncate font-semibold">${esc(file.name)}</p>
        <p class="text-[13px] text-muted">${formatBytes(file.size)}</p>
      </div>
      <button type="button" class="btn-ghost btn-sm" data-change-file>Change</button>
      <button type="button" class="btn-primary" data-start-import>${icon('upload', { size: 16 })} Import contacts</button>
    </div>`;
}

function results(report) {
  const card = (label, value, className) => `
    <div class="panel px-5 py-4">
      <p class="text-xs text-muted">${label}</p>
      <p class="mt-1 text-3xl font-extrabold tabular-nums ${className}">${value}</p>
    </div>`;

  const failedRows = report.errors
    .map(
      (row) => `
      <tr class="align-top">
        <td class="whitespace-nowrap px-4 py-3 font-semibold tabular-nums">Line ${row.line}</td>
        <td class="px-4 py-3">
          <p class="font-medium">${esc([row.data.firstName, row.data.lastName].filter(Boolean).join(' ')) || '<span class="text-faint">(no name)</span>'}</p>
          <p class="text-[13px] text-muted">${esc(row.data.email || row.data.phone || '')}</p>
        </td>
        <td class="px-4 py-3">
          <ul class="space-y-1">${row.errors.map((message) => `<li class="flex gap-1.5 text-danger">${icon('alert', { size: 14, className: 'mt-0.5' })}${esc(message)}</li>`).join('')}</ul>
        </td>
      </tr>`,
    )
    .join('');

  return `
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
      ${card('Rows in file', report.totalRows, '')}
      ${card('Imported', report.imported, 'text-leaf')}
      ${card('Skipped', report.failed, report.failed ? 'text-danger' : '')}
    </div>

    ${
      report.failed
        ? `<section class="panel mt-6 overflow-hidden">
            <div class="border-b border-rule px-5 py-4">
              <h2 class="panel-title">Rows that were skipped</h2>
              <p class="mt-0.5 text-sm text-muted">Fix these lines in your file and import it again. Rows already imported are detected as duplicates.</p>
            </div>
            <div class="scroll-thin overflow-x-auto">
              <table class="w-full text-left text-sm">
                <thead class="bg-well/60 text-[13px] text-muted"><tr>
                  <th class="px-4 py-2.5 font-semibold">Line</th><th class="px-4 py-2.5 font-semibold">Contact</th><th class="px-4 py-2.5 font-semibold">Problem</th>
                </tr></thead>
                <tbody class="divide-y divide-rule">${failedRows}</tbody>
              </table>
            </div>
          </section>`
        : `<div class="panel mt-6 flex items-center gap-3 px-5 py-4 text-sm">${icon('checkCircle', { size: 18, className: 'text-leaf' })} Every row was imported.</div>`
    }

    <div class="mt-6 flex justify-end gap-2">
      <button type="button" class="btn-secondary" data-import-another>Import another file</button>
      <a href="#/contacts" class="btn-primary">View contacts</a>
    </div>`;
}

export function renderImport() {
  let file = null;

  const root = mountPage(`
    <div class="max-w-4xl">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="text-3xl font-extrabold tracking-tight">Import contacts</h1>
          <p class="mt-1 text-muted">Upload a CSV from Excel, Google Sheets or your phone. Each row is checked on its own; bad rows are reported, never half-saved.</p>
        </div>
        <button type="button" class="btn-secondary" data-template>${icon('download', { size: 16 })} Template</button>
      </div>
      <div class="mt-6" data-steps>${steps(1)}</div>
      <div class="mt-6" data-body></div>
    </div>`);

  const body = $('[data-body]', root);

  const showPicker = () => {
    file = null;
    $('[data-steps]', root).innerHTML = steps(1);
    body.innerHTML = dropzone();
  };

  const chooseFile = (candidate) => {
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith('.csv')) return toast('Choose a .csv file', 'error');
    if (candidate.size > MAX_BYTES) return toast('The file is larger than 2 MB', 'error');
    file = candidate;
    body.innerHTML = selectedFile(file);
  };

  root.addEventListener('change', (event) => {
    if (event.target.matches('[data-file-input]')) chooseFile(event.target.files[0]);
  });

  // Drag and drop onto the dashed area
  root.addEventListener('dragover', (event) => {
    const zone = event.target.closest('[data-dropzone]');
    if (!zone) return;
    event.preventDefault();
    zone.classList.add('border-accent', 'bg-accent/5');
  });
  root.addEventListener('dragleave', (event) => {
    event.target.closest('[data-dropzone]')?.classList.remove('border-accent', 'bg-accent/5');
  });
  root.addEventListener('drop', (event) => {
    if (!event.target.closest('[data-dropzone]')) return;
    event.preventDefault();
    chooseFile(event.dataTransfer.files[0]);
  });

  root.addEventListener('click', async (event) => {
    const target = event.target;

    if (target.closest('[data-template]')) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([TEMPLATE_CSV], { type: 'text/csv' }));
      link.download = 'cardfile-import-template.csv';
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }

    if (target.closest('[data-change-file]') || target.closest('[data-import-another]')) showPicker();

    const startButton = target.closest('[data-start-import]');
    if (startButton && file) {
      try {
        const { data } = await withBusy(startButton, () => api.importCsv(file));
        $('[data-steps]', root).innerHTML = steps(2);
        body.innerHTML = results(data);
        toast(`Imported ${data.imported} of ${data.totalRows} rows`, data.imported ? 'success' : 'error');
        if (data.imported) notifyDataChanged();
      } catch (error) {
        toastError(error);
      }
    }
  });

  showPicker();
}
