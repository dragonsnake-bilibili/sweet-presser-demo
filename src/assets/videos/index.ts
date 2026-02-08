const video_loaders = import.meta.glob("./*/*");
const videos: Map<string, { video: string; weight: number }[]> = new Map();
const video_samplers: Map<string, () => string> = new Map();
for (const [name, video_loader] of Object.entries(video_loaders)) {
  const [command_name, file_name] = name.split("/").slice(-2) as [
    string,
    string,
  ];
  const video = ((await video_loader()) as any).default;
  const weight = Number.parseInt(file_name);
  const batch = videos.get(command_name);
  if (batch === undefined) {
    videos.set(command_name, [{ video, weight }]);
  } else {
    batch.push({ video, weight });
  }
}
for (const [name, video_list] of videos) {
  video_list.sort(({ weight: lhs }, { weight: rhs }) => rhs - lhs);
  const total = video_list.reduce((sum, { weight }) => sum + weight, 0);
  const weights = video_list.map(({ weight }) => weight / total);
  video_samplers.set(name.replaceAll("-", " "), () => {
    let sample = Math.random();
    for (const [i, weight_] of weights.entries()) {
      sample -= weight_;
      if (sample <= 0) {
        return video_list[i]!.video;
      }
    }
    return video_list.at(-1)!.video;
  });
}
export default video_samplers;
