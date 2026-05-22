export type Testimonial = {
  id: string;
  name: string;
  role: string;
  comment: string;
  rating: number;
  avatar: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: "1",
    name: "Valentina R.",
    role: "Profesional · Chapinero",
    comment:
      "Llevo 3 meses con FRESKO. La calidad es increíble y llega siempre fresco. Mi almuerzo favorito en Bogotá.",
    rating: 5,
    avatar: "VR",
  },
  {
    id: "2",
    name: "Andrés M.",
    role: "Emprendedor · Usaquén",
    comment:
      "El arma tu bowl es adictivo. Puedo comer saludable sin sacrificar sabor. La entrega es rapidísima.",
    rating: 5,
    avatar: "AM",
  },
  {
    id: "3",
    name: "Camila S.",
    role: "Diseñadora · Rosales",
    comment:
      "El plan Smart me ahorra tiempo y dinero. Cada bowl se siente hecho a medida. 100% recomendado.",
    rating: 5,
    avatar: "CS",
  },
];
