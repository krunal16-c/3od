'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ApiClientError, createRfq, uploadRfqFile } from '../../lib/api-client';

const fieldStyle = { width: '100%', border: '1px solid var(--line)', background: 'var(--paper)', padding: '13px 14px', color: 'var(--ink)', font: 'inherit' };
const labelStyle = { display: 'grid', gap: 8, fontSize: 14, fontWeight: 600 };

function errorMessage(error: unknown) {
  if (error instanceof ApiClientError) return error.message;
  return 'We could not send your request. Please try again.';
}

function idempotencyKey() {
  return globalThis.crypto?.randomUUID?.() ?? `rfq-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function RfqForm() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [rfqId, setRfqId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (submitted) {
    return (
      <section style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: 28, maxWidth: 760 }} aria-live="polite">
        <p className="eyebrow">Request received</p>
        <h2 style={{ margin: '16px 0' }}>Your quote request is on its way</h2>
        <p className="lead">We’ll show matching printer owners your brief. Your reference is <strong>{rfqId}</strong>.</p>
        <Link className="button" href="/">Back to 3oD <span aria-hidden="true">↗</span></Link>
      </section>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('project') ?? '').trim();
    const quantity = Number(form.get('quantity'));
    if (!title) { setError('Add a project title so printers know what they are quoting.'); return; }
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) { setError('Attach a 3D design file to continue.'); return; }
    if (quantity < 1) { setError('Quantity must be at least 1.'); return; }
    setError('');

    setSubmitting(true);
    try {
      const { rfq } = await createRfq({
        title,
        material: String(form.get('material') ?? '').trim() || undefined,
        finish: String(form.get('finish') ?? '').trim() || undefined,
        quantity,
        neededBy: String(form.get('deadline') ?? '').trim() || undefined,
        notes: String(form.get('notes') ?? '').trim() || undefined,
      }, idempotencyKey());
      await uploadRfqFile(rfq.id, file);
      setRfqId(rfq.id);
      setSubmitted(true);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ background: 'var(--white)', border: '1px solid var(--line)', padding: 28, maxWidth: 760 }}>
      <div style={{ display: 'grid', gap: 18 }}>
        <label style={labelStyle}>Project title<input style={fieldStyle} name="project" aria-label="Project title" placeholder="e.g. Prototype enclosure" /></label>
        <label style={labelStyle}>3D design file<input style={fieldStyle} name="file" type="file" accept=".stl,.obj,.step,.stp,.3mf" aria-label="3D design file" /></label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 }}>
          <label style={labelStyle}>Material<select style={fieldStyle} name="material" aria-label="Material" defaultValue="PLA"><option>PLA</option><option>PETG</option><option>ABS</option><option>Resin</option><option>Not sure yet</option></select></label>
          <label style={labelStyle}>Finish<select style={fieldStyle} name="finish" aria-label="Finish" defaultValue="Standard"><option>Standard</option><option>Smooth</option><option>Painted</option><option>Not sure yet</option></select></label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 18 }}>
          <label style={labelStyle}>Quantity<input style={fieldStyle} name="quantity" type="number" min="1" defaultValue="1" aria-label="Quantity" /></label>
          <label style={labelStyle}>Needed by<input style={fieldStyle} name="deadline" type="date" aria-label="Needed by" /></label>
        </div>
        <label style={labelStyle}>Project notes<textarea style={{ ...fieldStyle, minHeight: 120, resize: 'vertical' }} name="notes" aria-label="Project notes" placeholder="Tell printers anything they should know." /></label>
        {error && <p role="alert" style={{ color: 'var(--orange-dark)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{error}</p>}
        <button className="button" type="submit" disabled={submitting}>{submitting ? 'Sending request…' : 'Send request for quote'} <span aria-hidden="true">↗</span></button>
      </div>
      <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.5, margin: '22px 0 0' }}>Your design file is uploaded directly to protected 3oD storage.</p>
    </form>
  );
}
