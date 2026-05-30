export type Scene = {
  name: string;
  icon: string;
};

export type Category = {
  name: string;
  scenes: Scene[];
};

export const TOPICS: Category[] = [
  {
    name: 'Daily Life',
    scenes: [
      { name: 'At the café',        icon: '☕' },
      { name: 'My hobbies',         icon: '🎨' },
      { name: 'Morning routine',    icon: '🌅' },
      { name: 'Family time',        icon: '👨‍👩‍👧' },
      { name: 'My idol',            icon: '⭐' },
      { name: 'Neighborhood walk',  icon: '🏘️' },
      { name: 'Weekend plans',      icon: '📅' },
      { name: 'Fika',               icon: '🧁' },
    ],
  },
  {
    name: 'Travel',
    scenes: [
      { name: 'Planning a trip',  icon: '✈️' },
      { name: 'At the airport',   icon: '🛫' },
      { name: 'Hotel check-in',   icon: '🏨' },
      { name: 'Getting around',   icon: '🗺️' },
      { name: 'Sightseeing',      icon: '📸' },
      { name: 'Local food',       icon: '🍜' },
      { name: 'Lost in the city', icon: '😅' },
      { name: 'Packing tips',     icon: '🧳' },
    ],
  },
  {
    name: 'Work & Study',
    scenes: [
      { name: 'Job interview',       icon: '👔' },
      { name: 'In a meeting',        icon: '💼' },
      { name: 'Study habits',        icon: '📖' },
      { name: 'Career goals',        icon: '🎯' },
      { name: 'Work-life balance',   icon: '⚖️' },
      { name: 'Coworkers',           icon: '👥' },
      { name: 'First day at work',   icon: '🆕' },
      { name: 'Online learning',     icon: '💻' },
    ],
  },
  {
    name: 'Food & Drink',
    scenes: [
      { name: 'Ordering food',      icon: '🍽️' },
      { name: 'Cooking at home',    icon: '👨‍🍳' },
      { name: 'Local cuisine',      icon: '🌮' },
      { name: 'Restaurant visit',   icon: '🍷' },
      { name: 'Diet & health',      icon: '🥗' },
      { name: 'Street food',        icon: '🌯' },
      { name: 'Favourite dish',     icon: '❤️' },
      { name: 'Grocery shopping',   icon: '🛒' },
    ],
  },
  {
    name: 'Entertainment',
    scenes: [
      { name: 'Movies & TV',      icon: '🎬' },
      { name: 'Music & concerts', icon: '🎵' },
      { name: 'Sports',           icon: '⚽' },
      { name: 'Books',            icon: '📚' },
      { name: 'Gaming',           icon: '🎮' },
      { name: 'Social media',     icon: '📱' },
      { name: 'Art & museums',    icon: '🖼️' },
      { name: 'Podcasts',         icon: '🎙️' },
    ],
  },
  {
    name: 'Culture',
    scenes: [
      { name: 'Local customs',       icon: '🏮' },
      { name: 'Holidays & festivals',icon: '🎉' },
      { name: 'Weather & seasons',   icon: '☀️' },
      { name: 'News & events',       icon: '📰' },
      { name: 'Environment',         icon: '🌿' },
      { name: 'Fashion trends',      icon: '👗' },
      { name: 'Traditions',          icon: '🎋' },
      { name: 'City vs countryside', icon: '🌆' },
    ],
  },
];
