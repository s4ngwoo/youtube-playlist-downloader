/** Pure session activity copy keys for download progress UX. */

export type ActivityCounts = {
  receiving: number;
  queued: number;
  postprocess: number;
  completed: number;
  failed: number;
  total: number;
};

export type ActivityDescription = {
  key: string;
  vars: Record<string, string | number>;
};

export function describeSessionActivity(c: ActivityCounts): ActivityDescription {
  const { receiving, queued, postprocess, total } = c;

  if (receiving === 0 && postprocess === 0 && queued > 0) {
    return { key: "status.preparingDownloads", vars: { count: queued } };
  }

  if (receiving > 0 && postprocess > 0) {
    return { key: "status.activityMixed", vars: { recv: receiving, post: postprocess } };
  }

  if (receiving === 0 && postprocess > 0) {
    return { key: "status.activityPostprocess", vars: { count: postprocess } };
  }

  if (receiving > 0) {
    return {
      key: "status.activityReceiving",
      vars: { recv: receiving, queued, total: total || receiving + queued },
    };
  }

  return { key: "status.preparingDownloads", vars: { count: total || 0 } };
}
