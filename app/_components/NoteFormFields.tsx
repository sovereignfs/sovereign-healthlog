'use client';

import { useEffect, useState } from 'react';
import { FormField, Input, Select, Textarea } from '@sovereignfs/ui';
import type { LinkableRecord, NoteEntry } from '../_lib/actions';
import { listLinkableRecords } from '../_lib/actions';
import { now, toLocalDateTimeInputValue } from '../_lib/formUtils';
import type { NoteLinkType } from '../_lib/notes';
import { NOTE_CATEGORIES, NOTE_CATEGORY_LABELS, NOTE_LINK_TYPES, NOTE_LINK_TYPE_LABELS } from '../_lib/notes';
import styles from './NoteFormFields.module.css';

export function NoteFormFields({ entry }: { entry?: NoteEntry }) {
  const [linkType, setLinkType] = useState<string>(entry?.linkedType ?? '');
  const [linkedId, setLinkedId] = useState<string>(entry?.linkedId ?? '');
  const [options, setOptions] = useState<LinkableRecord[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  useEffect(() => {
    if (!linkType) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    setLoadingOptions(true);
    void listLinkableRecords(linkType).then((result) => {
      if (cancelled) return;
      // The currently-linked record must stay selectable even when it falls
      // outside the 25 most recent — otherwise no option would match the
      // intended value, and re-saving the note (for an unrelated change)
      // would silently drop the link. `linkedId` below is a *controlled*
      // select for the same reason: options arrive after this async fetch
      // resolves, and a `defaultValue` set at mount (before any options
      // exist) never gets retroactively applied once matching options show
      // up later — only a controlled `value` re-selects correctly when its
      // options change out from under it.
      const currentStillLinked =
        entry?.linkedId && entry.linkedType === linkType && entry.linkedLabel
          ? { id: entry.linkedId, label: entry.linkedLabel }
          : null;
      const alreadyIncluded = currentStillLinked
        ? result.some((option) => option.id === currentStillLinked.id)
        : true;
      setOptions(currentStillLinked && !alreadyIncluded ? [currentStillLinked, ...result] : result);
      setLoadingOptions(false);
    });
    return () => {
      cancelled = true;
    };
  }, [linkType, entry?.linkedId, entry?.linkedType, entry?.linkedLabel]);

  const linkTypeLabel = NOTE_LINK_TYPE_LABELS[linkType as NoteLinkType];

  return (
    <>
      <FormField label="Title">
        {(field) => <Input {...field} name="title" defaultValue={entry?.title ?? ''} required />}
      </FormField>

      <div className={styles.row}>
        <FormField label="Category">
          {(field) => (
            <Select {...field} name="category" defaultValue={entry?.category ?? 'general'}>
              {NOTE_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {NOTE_CATEGORY_LABELS[category]}
                </option>
              ))}
            </Select>
          )}
        </FormField>
        <FormField label="Date and time">
          {(field) => (
            <Input
              {...field}
              name="notedAt"
              type="datetime-local"
              defaultValue={toLocalDateTimeInputValue(entry ? entry.notedAt : now())}
            />
          )}
        </FormField>
      </div>

      <FormField label="Note">
        {(field) => <Textarea {...field} name="body" rows={5} defaultValue={entry?.body ?? ''} required />}
      </FormField>

      <FormField label="Link to" hint="Optional.">
        {(field) => (
          <Select
            {...field}
            name="linkedType"
            value={linkType}
            onChange={(e) => {
              setLinkType(e.target.value);
              // A selection from a previous type never applies to the new
              // one — id collisions across types are extremely unlikely but
              // not impossible, and a stale value here would submit a link
              // to the wrong kind of record.
              setLinkedId(e.target.value === entry?.linkedType ? (entry?.linkedId ?? '') : '');
            }}
          >
            <option value="">None</option>
            {NOTE_LINK_TYPES.map((type) => (
              <option key={type} value={type}>
                {NOTE_LINK_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        )}
      </FormField>

      {linkType && (
        <FormField label={`Choose a ${linkTypeLabel.toLowerCase()}`}>
          {(field) => (
            <Select
              {...field}
              name="linkedId"
              value={linkedId}
              onChange={(e) => setLinkedId(e.target.value)}
              disabled={loadingOptions}
              required
            >
              <option value="">{loadingOptions ? 'Loading…' : 'Choose…'}</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </Select>
          )}
        </FormField>
      )}
    </>
  );
}
