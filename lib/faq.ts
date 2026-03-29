export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  {
    question: "¿Cómo compro algo que está en stock?",
    answer:
      "Entrás a stock, elegís el producto y nos escribís para cerrar la compra y coordinar la entrega.",
  },
  {
    question: "¿Cómo compro por encargue internacional?",
    answer:
      "Entrás al catálogo de encargues, encontrás el producto que te interesa y seguimos por WhatsApp con esa referencia.",
  },
  {
    question: "¿Los precios ya incluyen impuestos?",
    answer:
      "Sí, la idea es que tengas el precio claro desde el arranque, sin trámites extra después del pago.",
  },
  {
    question: "¿Cuánto suele demorar un encargue?",
    answer:
      "Depende del producto y del momento, pero antes de avanzar te pasamos una referencia de tiempos para que sepas cómo viene el proceso.",
  },
  {
    question: "¿Qué diferencia hay entre stock y encargue?",
    answer:
      "Stock es lo que ya está disponible. Encargue es para productos del catálogo internacional que se gestionan a pedido.",
  },
  {
    question: "¿Cómo hago una consulta desde el catálogo?",
    answer:
      "Abrís el producto que te interesa y usás el botón de WhatsApp para seguir con esa referencia exacta.",
  },
  {
    question: "¿Puedo ver productos por marca o prenda?",
    answer:
      "Sí. Tanto en stock como en encargues podés filtrar por marca, categoría y otros criterios.",
  },
  {
    question: "¿Qué pasa si el talle no me queda bien?",
    answer:
      "Si tenés dudas con el talle, escribinos antes de confirmar y te ayudamos a revisar medidas o referencia. Si igual no resulta como esperabas, lo vemos caso por caso según el producto.",
  },
  {
    question: "¿Cómo sé si un producto sigue disponible?",
    answer:
      "Si está publicado, podés consultarlo. La confirmación final de disponibilidad la cerramos por WhatsApp al momento de avanzar.",
  },
  {
    question: "¿Pueden conseguir algo que no aparece en la web?",
    answer:
      "Sí, podés escribirnos con la idea de lo que buscás y vemos si lo podemos conseguir. Si hay chance real, te guiamos con el paso siguiente.",
  },
  {
    question: "¿Hacen envíos a todo el país?",
    answer:
      "Sí, coordinamos envíos dentro de Argentina. Cuando avances con tu consulta, te confirmamos opciones, costo y tiempos según tu ubicación.",
  },
  {
    question: "¿Puedo consultar varios productos juntos?",
    answer:
      "Sí. Si ya tenés identificados los productos en el catálogo, la consulta sale más rápida y precisa.",
  },
  {
    question: "¿Trabajan solo por WhatsApp?",
    answer:
      "Sí. El catálogo ordena la búsqueda y WhatsApp es el canal para confirmar, coordinar y seguir la compra.",
  },
  {
    question: "¿Qué hago si ya elegí un producto?",
    answer:
      "Abrí el detalle y escribinos desde el botón correspondiente para avanzar con ese artículo puntual.",
  },
];

export const homepageFaqItems = faqItems.slice(0, 3);
