import { Recipe, type CreateRecipeInput } from "../../domain/entities/recipe";

// Sample recipe content (Spanish domain content, not code), reusing bundled
// product photos so the section works offline with no remote media config.
const SEED_DATA: CreateRecipeInput[] = [
  {
    id: "aaaa1111-1111-4111-8111-aaaaaaaa1111",
    title: "Torta de chocolate húmeda",
    description:
      "Nuestra torta insignia: bizcocho húmedo, ganache brillante y cerezas.",
    difficulty: "media",
    durationMinutes: 90,
    ingredients: [
      "200 g de harina de trigo",
      "60 g de cacao en polvo",
      "250 g de azúcar",
      "3 huevos",
      "150 ml de aceite vegetal",
      "200 ml de leche",
      "200 g de chocolate oscuro (ganache)",
      "200 ml de crema de leche (ganache)",
    ],
    steps: [
      "Precalienta el horno a 175 °C y engrasa un molde de 22 cm.",
      "Tamiza la harina con el cacao y mezcla con el azúcar.",
      "Bate los huevos con el aceite y la leche; integra los secos sin sobrebatir.",
      "Hornea 40–45 minutos, hasta que un palillo salga limpio. Deja enfriar.",
      "Calienta la crema, viértela sobre el chocolate picado y mezcla hasta lograr una ganache lisa.",
      "Cubre la torta con la ganache y decora con cerezas.",
    ],
    imageUrl: "/products/torta-de-chocolate.png",
    published: true,
  },
  {
    id: "bbbb2222-2222-4222-8222-bbbbbbbb2222",
    title: "Cheesecake de frutos rojos",
    description:
      "Base crocante de galleta, relleno cremoso y una capa brillante de frutos rojos.",
    difficulty: "facil",
    durationMinutes: 60,
    ingredients: [
      "200 g de galletas María",
      "100 g de mantequilla derretida",
      "500 g de queso crema",
      "120 g de azúcar",
      "200 ml de crema de leche",
      "300 g de frutos rojos",
    ],
    steps: [
      "Tritura las galletas, mézclalas con la mantequilla y compacta la base en el molde.",
      "Bate el queso crema con el azúcar y la crema hasta que quede sedoso.",
      "Vierte el relleno sobre la base y refrigera al menos 4 horas.",
      "Cocina los frutos rojos con un poco de azúcar hasta formar una salsa y cubre el cheesecake.",
    ],
    imageUrl: "/products/cheesecake-de-fresa.png",
    published: true,
  },
];

/** Builds the initial recipes, failing loudly if any seed entry is invalid. */
export function buildRecipeSeed(): Recipe[] {
  return SEED_DATA.map((input) => {
    const result = Recipe.create(input);
    if (!result.ok) {
      throw new Error(`Invalid recipe seed "${input.title}": ${result.error.message}`);
    }
    return result.value;
  });
}
