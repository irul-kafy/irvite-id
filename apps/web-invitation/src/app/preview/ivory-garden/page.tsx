import type { Metadata } from 'next';
import { RenderTheme } from '../../../renderers/registry';
import {
  buildIvoryGardenPreviewData,
  IVORY_GARDEN_PREVIEW_UNIQUE_CODE,
} from '../../../preview/ivory-garden-preview-data';

export const metadata: Metadata = {
  title: 'Ivory Garden Preview',
  robots: { index: false, follow: false },
};

/** Static showcase only: no backend request or persisted invitation data. */
export default function IvoryGardenPreviewPage() {
  return (
    <main>
      <RenderTheme
        themeCode="IVORY_GARDEN"
        data={buildIvoryGardenPreviewData()}
        uniqueCode={IVORY_GARDEN_PREVIEW_UNIQUE_CODE}
        isPreview={true}
        mode="PERSONAL"
      />
    </main>
  );
}
