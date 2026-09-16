/** @vitest-environment jsdom */

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '@/App';
import { TEMPLATE_CSV } from '@/lib/importPlayers';
import { ROOM_CONNECTION_KEY } from '@/lib/roomConnection';
import { STORAGE_KEY } from '@/lib/storage';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof File !== 'undefined' && typeof File.prototype.arrayBuffer !== 'function') {
  File.prototype.arrayBuffer = function arrayBuffer() {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error ?? new Error('Could not read file.'));
      reader.readAsArrayBuffer(this);
    });
  };
}

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

function setInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('draft board app', () => {
  let root: Root | undefined;
  let container: HTMLDivElement;
  let storage: MemoryStorage;

  async function renderBoard() {
    await act(async () => {
      root?.render(<App />);
    });
    const local = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Try a sandbox'),
    );
    if (!local) throw new Error(`missing local mode: ${container.textContent}`);
    await act(async () => {
      local.click();
    });
  }

  beforeEach(() => {
    storage = new MemoryStorage();
    Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ rooms: [] }), { headers: { 'Content-Type': 'application/json' } })),
    );
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container.remove();
    storage.removeItem(STORAGE_KEY);
    storage.removeItem(ROOM_CONNECTION_KEY);
    vi.unstubAllGlobals();
  });

  it('opens on a lobby that lists rooms', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            rooms: [
              {
                id: '7K2MQX',
                name: 'Tripod 2026',
                playerCount: 80,
                pickCount: 2,
                updatedAt: '2026-09-12T01:00:00.000Z',
              },
            ],
          }),
          { headers: { 'Content-Type': 'application/json' } },
        ),
      ),
    );
    await act(async () => {
      root?.render(<App />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Choose a draft');
    expect(container.textContent).toContain('Tripod 2026');
    expect(container.textContent).toContain('7K2MQX');
    expect(container.textContent).not.toContain('Who is still on the board');
  });

  it('opens a sandbox trial that is not written to localStorage', async () => {
    await renderBoard();
    expect(container.textContent).toContain('Sandbox trial');
    expect(container.textContent).toContain('not saved when you close the browser');
    expect(container.textContent).toContain('Who is still on the board');
    expect(storage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('seeds the pool and records a last-minute add to the team on the clock', async () => {
    await renderBoard();

    expect(container.textContent).toContain('Who is still on the board');
    expect(container.textContent).toContain('James Whitby');
    expect(container.textContent).not.toContain('Other captains');
    expect(container.textContent).toContain('100');
    const exportButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Export'),
    );
    expect(exportButton?.disabled).toBe(true);

    const addButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Add player'),
    );
    if (!addButton) throw new Error('missing add player');
    await act(async () => {
      addButton.click();
    });

    const nameInput = container.querySelector('input[placeholder="Last-minute add"]');
    if (!(nameInput instanceof HTMLInputElement)) throw new Error('missing name input');
    await act(async () => {
      setInputValue(nameInput, 'Pat Lee');
    });

    const positionSelect = Array.from(container.querySelectorAll('select')).find((select) =>
      select.closest('label')?.textContent?.includes('Position'),
    );
    if (!(positionSelect instanceof HTMLSelectElement)) throw new Error('missing position');
    await act(async () => {
      positionSelect.value = 'Goalie';
      positionSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const submit = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Add to pool'),
    );
    if (!submit) throw new Error('missing submit');
    await act(async () => {
      submit.click();
    });

    const search = container.querySelector('input[placeholder="Filter names..."]');
    if (!(search instanceof HTMLInputElement)) throw new Error('missing search');
    await act(async () => {
      setInputValue(search, 'Pat Lee');
    });

    expect(container.textContent).toContain('Pat Lee');
    expect(Array.from(container.querySelectorAll('button')).some((button) => button.textContent === 'Take')).toBe(
      false,
    );

    const picked = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Mark Picked');
    if (!picked) throw new Error('missing picked');
    await act(async () => {
      picked.click();
    });

    expect(container.textContent).toContain('Pat Lee');
    expect(container.textContent).toContain('#1');
    expect(container.textContent).toContain('Team 1');
    const exportReady = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Export'),
    );
    expect(exportReady?.disabled).toBe(false);
  });

  it('opens a team roster popup and toggles the main list to taken players', async () => {
    await renderBoard();

    const search = container.querySelector('input[placeholder="Filter names..."]');
    if (!(search instanceof HTMLInputElement)) throw new Error('missing search');
    await act(async () => {
      setInputValue(search, 'James Whitby');
    });

    const picked = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Mark Picked');
    if (!picked) throw new Error('missing picked');
    await act(async () => {
      picked.click();
    });

    expect(container.textContent).not.toContain('James Whitby 2028');

    const takenToggle = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Taken');
    if (!takenToggle) throw new Error('missing taken toggle');
    await act(async () => {
      takenToggle.click();
    });

    expect(container.textContent).toContain('Who has already been taken');
    expect(container.textContent).toContain('James Whitby');
    expect(container.textContent).toContain('Team 1');

    const teamRoster = container.querySelector('[aria-label="Team 1 roster"]');
    if (!(teamRoster instanceof HTMLButtonElement)) throw new Error('missing team roster button');
    await act(async () => {
      teamRoster.click();
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Team 1 roster');
    expect(dialog?.textContent).toContain('James Whitby');
    expect(dialog?.textContent).toContain('#1');
  });

  it('lists captains above picks on a team roster card', async () => {
    await renderBoard();

    const search = container.querySelector('input[placeholder="Filter names..."]');
    if (!(search instanceof HTMLInputElement)) throw new Error('missing search');
    await act(async () => {
      setInputValue(search, 'James Whitby');
    });
    const picked = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Mark Picked');
    if (!picked) throw new Error('missing picked');
    await act(async () => {
      picked.click();
    });

    await act(async () => {
      setInputValue(search, 'Asher Jensen');
    });
    const asher = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Asher Jensen'),
    );
    if (!asher) throw new Error('missing Asher');
    await act(async () => {
      asher.click();
    });
    const captainSelect = Array.from(container.querySelectorAll('label'))
      .find((label) => label.textContent?.includes('Captain for team'))
      ?.querySelector('select');
    if (!(captainSelect instanceof HTMLSelectElement)) throw new Error('missing captain team select');
    const teamOne = Array.from(captainSelect.options).find((option) => option.textContent?.includes('Team 1'));
    if (!teamOne) throw new Error('missing Team 1 option');
    await act(async () => {
      captainSelect.value = teamOne.value;
      captainSelect.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const cap = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Mark as captain'),
    );
    if (!cap) throw new Error('missing captain action');
    await act(async () => {
      cap.click();
    });

    const teamRoster = container.querySelector('[aria-label="Team 1 roster"]');
    if (!(teamRoster instanceof HTMLButtonElement)) throw new Error('missing team roster button');
    await act(async () => {
      teamRoster.click();
    });

    const dialog = container.querySelector('[role="dialog"]');
    const text = dialog?.textContent ?? '';
    expect(text).toContain('Captain');
    expect(text.indexOf('Asher Jensen')).toBeGreaterThan(-1);
    expect(text.indexOf('Asher Jensen')).toBeLessThan(text.indexOf('James Whitby'));
  });

  it('corrects a past pick without moving later assignments', async () => {
    await renderBoard();

    const search = container.querySelector('input[placeholder="Filter names..."]');
    if (!(search instanceof HTMLInputElement)) throw new Error('missing search');

    await act(async () => {
      setInputValue(search, 'James Whitby');
    });
    const firstPick = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Mark Picked');
    if (!firstPick) throw new Error('missing first picked');
    await act(async () => {
      firstPick.click();
    });

    await act(async () => {
      setInputValue(search, 'Bennett Reeve');
    });
    const secondPick = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Mark Picked');
    if (!secondPick) throw new Error('missing second picked');
    await act(async () => {
      secondPick.click();
    });

    const correct = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('Correct'));
    if (!correct) throw new Error('missing correct');
    await act(async () => {
      correct.click();
    });

    const dialog = container.querySelector('[role="dialog"]');
    expect(dialog?.textContent).toContain('Correct a pick');
    expect(dialog?.textContent).toContain('James Whitby');
    expect(dialog?.textContent).toContain('Bennett Reeve');

    const pickOne = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('#1') && button.textContent?.includes('James Whitby'),
    );
    if (!pickOne) throw new Error('missing pick one row');
    await act(async () => {
      pickOne.click();
    });

    const replacementSearch = container.querySelector('input[placeholder="Find a replacement..."]');
    if (!(replacementSearch instanceof HTMLInputElement)) throw new Error('missing replacement search');
    await act(async () => {
      setInputValue(replacementSearch, 'Asher Jensen');
    });

    const replacement = container.querySelector('[aria-label="Assign Asher Jensen to pick 1"]');
    if (!(replacement instanceof HTMLButtonElement)) throw new Error('missing replacement');
    await act(async () => {
      replacement.click();
    });

    expect(container.textContent).toContain('Asher Jensen');
    expect(container.textContent).toContain('Bennett Reeve');
    expect(container.querySelector('[aria-label="Correct pick 1"]')?.textContent).toContain('Asher Jensen');
    expect(container.querySelector('[aria-label="Correct pick 2"]')?.textContent).toContain('Bennett Reeve');

    const close = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Close' && button.closest('[role="dialog"]'),
    );
    if (!close) throw new Error('missing close');
    await act(async () => {
      close.click();
    });

    const taken = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Taken');
    if (!taken) throw new Error('missing taken');
    await act(async () => {
      taken.click();
    });
    expect(container.textContent).toContain('Asher Jensen');
    expect(container.textContent).toContain('Bennett Reeve');
    expect(container.textContent).not.toContain('James Whitby 2028');
  });

  it('lets you rate a player in Plan and keeps the rating on the draft board', async () => {
    await renderBoard();

    const plan = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Plan'),
    );
    if (!plan) throw new Error('missing plan');
    await act(async () => {
      plan.click();
    });

    expect(container.textContent).toContain('Rate the pool');
    expect(container.textContent).not.toContain('Who is still on the board');

    const search = container.querySelector('input[placeholder="Filter names..."]');
    if (!(search instanceof HTMLInputElement)) throw new Error('missing search');
    await act(async () => {
      setInputValue(search, 'Miles Irwin');
    });

    const talent = container.querySelector('input[aria-label="Miles Irwin talent"]');
    if (!(talent instanceof HTMLInputElement)) throw new Error('missing talent');
    await act(async () => {
      setInputValue(talent, '2.5');
      talent.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    });

    const notes = container.querySelector('input[aria-label="Miles Irwin notes"]');
    if (!(notes instanceof HTMLInputElement)) throw new Error('missing notes');
    await act(async () => {
      setInputValue(notes, 'First round lock');
    });

    const back = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Back to draft'),
    );
    if (!back) throw new Error('missing back to draft');
    await act(async () => {
      back.click();
    });

    expect(container.textContent).toContain('Who is still on the board');
    const draftSearch = container.querySelector('input[placeholder="Filter names..."]');
    if (!(draftSearch instanceof HTMLInputElement)) throw new Error('missing draft search');
    await act(async () => {
      setInputValue(draftSearch, 'Miles Irwin');
    });

    const row = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Miles Irwin'),
    );
    if (!row) throw new Error('missing Miles row');
    await act(async () => {
      row.click();
    });

    expect(container.textContent).toContain('First round lock');
    const draftTalent = container.querySelector('input[aria-label="Talent"]');
    if (!(draftTalent instanceof HTMLInputElement)) throw new Error('missing selected talent');
    expect(draftTalent.value).toBe('2.5');
  });

  it('opens planning after an import', async () => {
    await renderBoard();

    const importButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Import'),
    );
    if (!importButton) throw new Error('missing import');
    await act(async () => {
      importButton.click();
    });

    const fileInput = container.querySelector('input[type="file"]');
    if (!(fileInput instanceof HTMLInputElement)) throw new Error('missing file input');
    const file = new File([TEMPLATE_CSV], 'pool.csv', { type: 'text/csv' });
    await act(async () => {
      Object.defineProperty(fileInput, 'files', { configurable: true, value: [file] });
      fileInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    let replace: HTMLButtonElement | undefined;
    for (let attempt = 0; attempt < 20 && !replace; attempt += 1) {
      replace = Array.from(container.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Replace pool'),
      );
      if (replace) break;
      await act(async () => {
        await Promise.resolve();
      });
    }
    if (!replace) throw new Error(`missing replace: ${container.textContent}`);
    await act(async () => {
      replace.click();
    });

    expect(container.textContent).toContain('Rate the pool');
    expect(container.textContent).toContain('Miles Irwin');
    expect(container.textContent).toContain('Oliver Mercer');
    expect(container.textContent).not.toContain('Who is still on the board');
  });

  it('lets you change the draft order with on-screen arrows before picks start', async () => {
    await renderBoard();

    expect(container.querySelector('ol li button')?.getAttribute('aria-label')).toBe('Team 1 roster');

    const edit = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === 'Edit');
    if (!edit) throw new Error('missing edit order');
    await act(async () => {
      edit.click();
    });

    const moveUp = container.querySelector('[aria-label="Move Our Team up"]');
    if (!(moveUp instanceof HTMLButtonElement)) throw new Error('missing move up');
    await act(async () => {
      moveUp.click();
    });
    await act(async () => {
      moveUp.click();
    });

    expect(container.querySelector('ol li button')?.getAttribute('aria-label')).toBe('Our Team roster');
    expect(container.textContent).toContain('#1');
    expect(container.querySelector('[aria-label="Move Our Team up"]')).toHaveProperty('disabled', true);
  });
});
