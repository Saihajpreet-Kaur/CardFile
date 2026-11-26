import { useState } from 'react';

const EMPTY = { firstName: '', lastName: '', email: '', phone: '', company: '', designation: '', tags: '', notes: '' };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side checks give instant feedback; the API validates again (it never trusts the client). */
function validate(values) {
  const errors = {};
  if (!values.firstName.trim()) errors.firstName = 'First name is required';
  if (!values.email.trim() && !values.phone.trim()) errors.email = 'Enter an email or a phone number';
  if (values.email.trim() && !EMAIL_PATTERN.test(values.email.trim())) errors.email = 'Enter a valid email address';
  if (values.phone.trim() && !/^\+?[\d\s()-]{7,20}$/.test(values.phone.trim())) errors.phone = 'Phone must contain 7-15 digits';
  if (values.tags.split(',').filter((tag) => tag.trim()).length > 10) errors.tags = 'At most 10 tags';
  return errors;
}

/**
 * Add / edit contact form. Controlled components: every input's value lives in React state.
 * Server validation errors (422 details, 409 duplicates) are shown under the matching field.
 */
export default function ContactForm({ contact, onSubmit, onCancel }) {
  const [values, setValues] = useState(() =>
    contact ? { ...EMPTY, ...contact, tags: (contact.tags ?? []).join(', ') } : EMPTY,
  );
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    if (errors[name]) setErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSaving(true); // also disables the button, which stops double submissions
    setFormError('');
    try {
      await onSubmit({
        firstName: values.firstName.trim(),
        lastName: values.lastName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        company: values.company.trim(),
        designation: values.designation.trim(),
        notes: values.notes.trim(),
        tags: values.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      });
    } catch (error) {
      if (Array.isArray(error.details)) {
        setErrors(Object.fromEntries(error.details.map((detail) => [detail.field, detail.message])));
      } else if (error.status === 409) {
        setErrors({ [error.details?.field ?? 'email']: error.message });
      } else {
        setFormError(error.message);
      }
      setSaving(false);
    }
  };

  const field = (name, label, props = {}) => (
    <div className={props.wide ? 'sm:col-span-2' : ''}>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        value={values[name]}
        onChange={handleChange}
        className={`input ${errors[name] ? 'input-error' : ''}`}
        aria-invalid={Boolean(errors[name])}
        {...props.input}
      />
      {errors[name] && <p className="field-error">{errors[name]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('firstName', 'First name *', { input: { autoFocus: true, maxLength: 50 } })}
        {field('lastName', 'Last name', { input: { maxLength: 50 } })}
        {field('email', 'Email', { input: { type: 'email' } })}
        {field('phone', 'Phone', { input: { type: 'tel', placeholder: '+91 98765 43210' } })}
        {field('company', 'Company', { input: { maxLength: 100 } })}
        {field('designation', 'Designation', { input: { maxLength: 100 } })}
        {field('tags', 'Tags (comma separated)', { wide: true, input: { placeholder: 'client, vip' } })}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" name="notes" rows={3} maxLength={1000} value={values.notes} onChange={handleChange} className="input" />
        </div>
      </div>
      {formError && <p className="field-error mt-4 text-sm">{formError}</p>}
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Saving…' : contact ? 'Save changes' : 'Add contact'}
        </button>
      </div>
    </form>
  );
}
