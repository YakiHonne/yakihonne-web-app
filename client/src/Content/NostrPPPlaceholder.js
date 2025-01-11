import ph1 from "../media/images/ImagesPH/random_cover_1.png";
import ph2 from "../media/images/ImagesPH/random_cover_2.png";
import ph3 from "../media/images/ImagesPH/random_cover_3.png";
import ph4 from "../media/images/ImagesPH/random_cover_4.png";
import ph5 from "../media/images/ImagesPH/random_cover_5.png";
import ph6 from "../media/images/ImagesPH/random_cover_6.png";
import ph7 from "../media/images/ImagesPH/random_cover_7.png";
import ph8 from "../media/images/ImagesPH/random_cover_8.png";
import ph9 from "../media/images/ImagesPH/random_cover_9.png";
import ph10 from "../media/images/ImagesPH/random_cover_10.png";

const nostrThumbnailPlaceholder = [
  ph1,
  ph2,
  ph3,
  ph4,
  ph5,
  ph6,
  ph7,
  ph8,
  ph9,
  ph10
];

const nostrPpPlaceholder = [
  "https://cdn.midjourney.com/a5f0dbec-9b4b-4dcc-9f6d-6d3a7549f030/grid_0.png",
  "https://cdn.midjourney.com/82f95faf-2811-4ccf-a3f4-a9005c462041/grid_0.png",
  "https://cdn.midjourney.com/5d8b069c-fadf-4927-af04-c538cd9e1a10/grid_0.png",
  "https://cdn.midjourney.com/ceb54da5-fcff-4653-bbe7-145122a93eb1/grid_0.png",
  "https://cdn.midjourney.com/e7ef0749-2923-486e-8aed-1b38be05940a/grid_0.png",
  "https://cdn.midjourney.com/1e562a82-1c85-4500-bf19-2ce6e6073b8b/grid_0.png",
  "https://cdn.midjourney.com/9b699fe4-9d00-4ed5-9f40-e87abd3a75c3/grid_0.png",
  "https://cdn.midjourney.com/aa78fc2f-d057-4d4d-83cc-072a0f1b67d3/grid_0.png",
];

const getImagePlaceholder = () => {
  return nostrThumbnailPlaceholder[Math.floor(Math.random() * 9)]
};

export { nostrPpPlaceholder, getImagePlaceholder };
