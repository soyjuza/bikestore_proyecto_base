/* Datos de demostración de BikeStore (los mismos del prototipo y de sql/bikestore.sql).
   Imágenes en /public/img: «recortes» son las fotos sin fondo (catálogo y portada)
   y «productos» son las fotos originales (segunda vista del detalle y créditos). */

export const CATEGORIAS = [
    { id: 'montana', nombre: 'Montaña', descripcion: 'Doble suspensión y rígidas para sendero y trocha.', foto: 1 },
    { id: 'ruta', nombre: 'Ruta', descripcion: 'Livianas y aerodinámicas para carretera.', foto: 4 },
    { id: 'urbana', nombre: 'Urbana', descripcion: 'Plegables y de paseo para moverse por la ciudad.', foto: 6 },
    { id: 'ninos', nombre: 'Niños', descripcion: 'Para aprender y para las primeras salidas.', foto: 8 },
    { id: 'accesorios', nombre: 'Accesorios', descripcion: 'Cascos, luces, ropa y herramientas.', foto: 10 }
];

export const TIPOS = {
    montana: 'Bicicleta de montaña',
    ruta: 'Bicicleta de ruta',
    urbana: 'Bicicleta urbana',
    ninos: 'Bicicleta infantil',
    accesorios: 'Accesorio'
};

export function categoriaById(id) {
    return CATEGORIAS.find((c) => c.id === id) || CATEGORIAS[0];
}

function p(id, nombre, categoria, precio, stock, descripcion, activo = true) {
    const code = 'p' + String(id).padStart(2, '0');
    return {
        id_producto: id,
        nombre,
        categoria,
        precio,
        stock,
        descripcion,
        activo,
        imagen: `/img/recortes/${code}.webp`,
        foto: `/img/productos/${code}.jpg`
    };
}

export const SEED_PRODUCTOS = [
    p(1, 'Bicicleta MTB R-5420', 'montana', 2849000, 6, 'Doble suspensión de 120 mm, transmisión Shimano 1x12, frenos hidráulicos de disco y aro 29.'),
    p(2, 'Scorpion MTB 29', 'montana', 899000, 11, 'Bicicleta todo terreno con suspensión delantera, cambios Shimano 3x8 y frenos de disco mecánico.'),
    p(3, 'Trail Pro 27,5', 'montana', 1650000, 0, 'Marco de aluminio para sendero técnico, horquilla de 140 mm y transmisión 1x11.'),
    p(4, 'Ruta R8-4720 Carbono', 'ruta', 5999000, 3, 'Marco de carbono, grupo Shimano 105 de 22 velocidades, frenos de disco hidráulico y 8,4 kg.'),
    p(5, 'Ruta Sprint Aluminio', 'ruta', 2390000, 5, 'Marco de aluminio con horquilla de carbono, grupo Shimano Sora de 18 velocidades.'),
    p(6, 'Urbana plegable City 20', 'urbana', 1190000, 8, 'Se pliega en segundos, aro 20, 7 velocidades y portaequipaje trasero.'),
    p(7, 'Urbana clásica Paseo', 'urbana', 980000, 2, 'Cuadro bajo para subir con facilidad, canasta delantera y guardabarros.'),
    p(8, 'Todo terreno niño aro 20', 'ninos', 500000, 9, 'Marco de aluminio liviano, 8 velocidades y frenos V-brake. Para 6 a 11 años.'),
    p(9, 'Bici de equilibrio aro 12', 'ninos', 260000, 4, 'Sin pedales, para que los más pequeños aprendan a mantener el equilibrio.'),
    p(10, 'Casco de ruta ventilado', 'accesorios', 100000, 24, 'Casco liviano con 18 entradas de aire y ajuste por dial trasero.'),
    p(11, 'Casco MTB con visera', 'accesorios', 150000, 15, 'Casco de montaña con visera, 16 entradas de aire y ajuste por dial trasero.'),
    p(12, 'Juego de luces USB', 'accesorios', 89000, 40, 'Luz delantera y trasera recargables por USB-C, con 5 modos y hasta 12 horas de uso.'),
    p(13, 'Traje de ruta', 'accesorios', 200000, 18, 'Jersey y culotte en lycra transpirable con badana de gel.'),
    p(14, 'Bomba de piso con manómetro', 'accesorios', 79000, 30, 'Hasta 160 psi, compatible con válvulas Presta y Schrader.'),
    p(15, 'Kit de herramientas', 'accesorios', 379000, 12, 'Multiherramienta de 24 funciones: llaves allen, destornilladores y troncha cadena.'),
    p(16, 'Candado en U', 'accesorios', 69000, 3, 'Acero endurecido de 14 mm con dos llaves de seguridad.'),
    p(17, 'Caramañola 750 ml', 'accesorios', 45000, 0, 'Botella de plástico flexible con válvula de chorro, para el portacaramañola.', false)
];

/* Fotos reales de Wikimedia Commons. La licencia pide nombrar al autor: se muestra en /creditos. */
export const CREDITOS = {
    1: { author: 'Matti Blume', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Cube,_Cyclingworld_Europe_2024,_Meerbusch_(P1180003).jpg' },
    2: { author: 'Sylenius', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:BMC_Team_Elite_29.JPG' },
    3: { author: 'Matti Blume', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Stevens,_Cyclingworld_Europe_2024,_Meerbusch_(P1170852).jpg' },
    4: { author: 'Tim Reddington', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Fyxation_Carbon_Adventure.jpg' },
    5: { author: 'Miro Chien', license: 'FAL', page: 'https://commons.wikimedia.org/wiki/File:Taiji_carbon_road_bike_from_Taiwan.jpg' },
    6: { author: 'Autor en Wikimedia Commons', license: 'Copyrighted free use', page: 'https://commons.wikimedia.org/wiki/File:Brompton1.jpeg' },
    7: { author: 'Dietmar Rabich', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:M%C3%BCnster,_Roxel,_St.-Pantaleon-Kirche,_Fahrrad_--_2025_--_2696.jpg' },
    8: { author: 'Matti Blume', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Rascal,_Eurobike_2024,_Frankfurt_am_Main_(EB245538).jpg' },
    9: { author: 'Keiichirou Shikano', license: 'CC BY 2.0', page: 'https://commons.wikimedia.org/wiki/File:Balance_bike.jpg' },
    10: { author: 'MET Helmets', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Met_trenta_3k_carbon_mips_bicycle_helmet.jpg' },
    11: { author: 'SonOfWasps', license: 'CC BY 4.0', page: 'https://commons.wikimedia.org/wiki/File:Bicycle_Helmet_0085_Transparent.png' },
    12: { author: 'Singlespeedfahrer', license: 'CC0', page: 'https://commons.wikimedia.org/wiki/File:Fahrrad_LED-Akku-Leuchte_Busch_%26_M%C3%BCller_Ixon_IQ.jpg' },
    13: { author: 'Adenosine Triphosphate', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:WTOS_Delft_cycling_jersey_(cropped).jpg' },
    14: { author: 'Ewok Slayer (en.wikipedia)', license: 'Dominio público', page: 'https://commons.wikimedia.org/wiki/File:Bike_pump.jpg' },
    15: { author: 'Armchair', license: 'CC BY-SA 3.0', page: 'https://commons.wikimedia.org/wiki/File:Bicycle_multi-tool.JPG' },
    16: { author: 'DC', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Kryptonite_New_York_standard_lock.jpg' },
    17: { author: 'Cjp24', license: 'CC BY-SA 4.0', page: 'https://commons.wikimedia.org/wiki/File:Z%C3%A9fal_bottles.jpg' }
};

// Solo para el modo demo: en el backend real las contraseñas se guardan con bcrypt (RNF-05).
export const SEED_USUARIOS = [
    { id_usuario: 1, nombre: 'Administrador BikeStore', email: 'admin@bikestore.co', password: 'admin1234', rol: 'admin', activo: true, created_at: '2026-08-12' },
    { id_usuario: 2, nombre: 'Laura Gómez', email: 'cliente@bikestore.co', password: 'cliente123', rol: 'cliente', activo: true, created_at: '2026-08-20' },
    { id_usuario: 3, nombre: 'Carlos Ruiz', email: 'carlos.ruiz@correo.co', password: 'carlos123', rol: 'cliente', activo: true, created_at: '2026-08-22' },
    { id_usuario: 4, nombre: 'Ana Torres', email: 'ana.torres@correo.co', password: 'anatorres1', rol: 'cliente', activo: false, created_at: '2026-08-25' },
    { id_usuario: 5, nombre: 'Mateo Rendón', email: 'mateo.rendon@correo.co', password: 'mateo1234', rol: 'cliente', activo: true, created_at: '2026-09-02' },
    { id_usuario: 6, nombre: 'Valentina Díaz', email: 'valentina.diaz@correo.co', password: 'vale12345', rol: 'cliente', activo: true, created_at: '2026-09-15' }
];

export const DEMO_ACCOUNTS = [
    { label: 'Cliente', email: 'cliente@bikestore.co', password: 'cliente123' },
    { label: 'Administrador', email: 'admin@bikestore.co', password: 'admin1234' }
];
