import type { PageBlock } from '@/data/types';
import { cx } from '@/lib/cx';
import s from './Chat.module.css';

/** Number blocks the way the plan does: matched blocks 1…n, unmatched ones "?". */
export function numberBlocks(blocks: PageBlock[]): Array<PageBlock & { n: string }> {
  let i = 0;
  return blocks.map((b) => ({ ...b, n: b.unmatched ? '?' : String(++i) }));
}

/** The uploaded sketch, drawn as labelled regions that match the plan's numbers. */
export function SketchFrame({ blocks, caption = 'Your sketch, as agent-ba read it', width = 200 }: { blocks: PageBlock[]; caption?: string; width?: number }) {
  const numbered = numberBlocks(blocks);
  return (
    <figure className={s.sketch} style={{ width, margin: 0 }} aria-label={`Sketch map: ${numbered.map((b) => `${b.n} ${b.kind}`).join(', ')}`}>
      {numbered.map((b, i) => (
        <div key={i} className={cx(s.region, i === 0 && s.regionTall, b.unmatched && s.regionUnmatched)}>
          <span className={s.regionNum}>{b.n}</span>
          {b.kind}
        </div>
      ))}
      <figcaption className={s.sketchCaption}>{caption}</figcaption>
    </figure>
  );
}

/** Numbered block list beside the sketch; unmatched blocks are flagged red and excluded from the price. */
export function BlockMap({ blocks }: { blocks: PageBlock[] }) {
  return (
    <ol className={s.blockList}>
      {numberBlocks(blocks).map((b, i) => (
        <li key={i} className={cx(s.blockRow, b.unmatched && s.blockUnmatched)}>
          <span>{b.n}</span>
          <span>
            <strong>{b.kind}</strong>{' '}
            <small>· {b.unmatched ? `${b.title}. Needs a quote from Chi, not in the RM 100.` : b.title}</small>
          </span>
        </li>
      ))}
    </ol>
  );
}
