import backgroundUrl from "../assets/arena-background/arena-battle-diwali.jpg";

const diwaliArena = {
    backgroundKey: "arena_background",
    backgroundUrl,
    width: 1024,
    height: 576,
    platforms: [
        { id: "ground", x: 0, y: 530, width: 1024 },
        { id: "lower-balcony", x: 535, y: 386, width: 489 },
        { id: "upper-balcony", x: 467, y: 323, width: 557 }
    ]
};

export default diwaliArena;
