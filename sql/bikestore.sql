-- BikeStore: esquema + datos iniciales.
-- El usuario administrador lo crea el backend al arrancar (startup/seedAdmin.js) con la contraseña cifrada,
-- por eso aquí no se insertan usuarios.

CREATE DATABASE IF NOT EXISTS bikestore
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;
USE bikestore;

DROP TABLE IF EXISTS pedido_detalle;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS carrito_items;
DROP TABLE IF EXISTS recuperaciones;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS usuarios;

CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,                          -- hash bcrypt (RNF-05)
    rol ENUM('admin','cliente') NOT NULL DEFAULT 'cliente',
    activo TINYINT(1) NOT NULL DEFAULT 1,                    -- RF-29
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RF-16: enlaces de recuperación de contraseña (un solo uso, 30 minutos)
CREATE TABLE recuperaciones (
    id_recuperacion INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    token CHAR(64) NOT NULL UNIQUE,
    expira DATETIME NOT NULL,
    usado TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE categorias (
    id_categoria VARCHAR(20) PRIMARY KEY,                    -- slug: montana, ruta...
    nombre VARCHAR(60) NOT NULL,
    descripcion VARCHAR(255)
);

CREATE TABLE productos (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    descripcion TEXT NOT NULL,
    categoria VARCHAR(20) NOT NULL,
    precio DECIMAL(12,0) NOT NULL,                           -- pesos colombianos, sin decimales
    stock INT NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,                    -- RF-20: se inactiva, no se borra
    imagen VARCHAR(255) NOT NULL,                            -- foto sin fondo (ruta /img/... o archivo en uploads/productos)
    foto VARCHAR(255) NULL,                                  -- foto original (segunda vista del detalle)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (categoria) REFERENCES categorias(id_categoria),
    CHECK (precio > 0),
    CHECK (stock >= 0)
);

-- RF-08: el carrito queda guardado en la cuenta
CREATE TABLE carrito_items (
    id_usuario INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    PRIMARY KEY (id_usuario, id_producto),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
    CHECK (cantidad > 0)
);

-- RF-09..12
CREATE TABLE pedidos (
    id_pedido INT AUTO_INCREMENT PRIMARY KEY,
    numero VARCHAR(20) UNIQUE,                               -- BS-2026-00031
    id_usuario INT NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado ENUM('Pagado','En preparación','Enviado','Entregado') NOT NULL DEFAULT 'Pagado',
    direccion VARCHAR(200) NOT NULL,
    ciudad VARCHAR(100) NOT NULL,
    telefono VARCHAR(30) NOT NULL,
    ultimos4 CHAR(4) NOT NULL,                               -- nunca se guarda el número completo
    total DECIMAL(12,0) NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

CREATE TABLE pedido_detalle (
    id_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_pedido INT NOT NULL,
    id_producto INT NOT NULL,
    nombre VARCHAR(120) NOT NULL,                            -- copia del momento de la compra
    categoria VARCHAR(20) NOT NULL,
    precio DECIMAL(12,0) NOT NULL,
    cantidad INT NOT NULL,
    FOREIGN KEY (id_pedido) REFERENCES pedidos(id_pedido) ON DELETE CASCADE,
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);

INSERT INTO categorias (id_categoria, nombre, descripcion) VALUES
('montana',    'Montaña',    'Doble suspensión y rígidas para sendero y trocha.'),
('ruta',       'Ruta',       'Livianas y aerodinámicas para carretera.'),
('urbana',     'Urbana',     'Plegables y de paseo para moverse por la ciudad.'),
('ninos',      'Niños',      'Para aprender y para las primeras salidas.'),
('accesorios', 'Accesorios', 'Cascos, luces, ropa y herramientas.');

INSERT INTO productos (id_producto, nombre, categoria, precio, stock, activo, descripcion, imagen, foto) VALUES
(1,  'Bicicleta MTB R-5420',        'montana',    2849000, 6,  1, 'Doble suspensión de 120 mm, transmisión Shimano 1x12, frenos hidráulicos de disco y aro 29.', '/img/recortes/p01.webp', '/img/productos/p01.jpg'),
(2,  'Scorpion MTB 29',             'montana',    899000,  11, 1, 'Bicicleta todo terreno con suspensión delantera, cambios Shimano 3x8 y frenos de disco mecánico.', '/img/recortes/p02.webp', '/img/productos/p02.jpg'),
(3,  'Trail Pro 27,5',              'montana',    1650000, 0,  1, 'Marco de aluminio para sendero técnico, horquilla de 140 mm y transmisión 1x11.', '/img/recortes/p03.webp', '/img/productos/p03.jpg'),
(4,  'Ruta R8-4720 Carbono',        'ruta',       5999000, 3,  1, 'Marco de carbono, grupo Shimano 105 de 22 velocidades, frenos de disco hidráulico y 8,4 kg.', '/img/recortes/p04.webp', '/img/productos/p04.jpg'),
(5,  'Ruta Sprint Aluminio',        'ruta',       2390000, 5,  1, 'Marco de aluminio con horquilla de carbono, grupo Shimano Sora de 18 velocidades.', '/img/recortes/p05.webp', '/img/productos/p05.jpg'),
(6,  'Urbana plegable City 20',     'urbana',     1190000, 8,  1, 'Se pliega en segundos, aro 20, 7 velocidades y portaequipaje trasero.', '/img/recortes/p06.webp', '/img/productos/p06.jpg'),
(7,  'Urbana clásica Paseo',        'urbana',     980000,  2,  1, 'Cuadro bajo para subir con facilidad, canasta delantera y guardabarros.', '/img/recortes/p07.webp', '/img/productos/p07.jpg'),
(8,  'Todo terreno niño aro 20',    'ninos',      500000,  9,  1, 'Marco de aluminio liviano, 8 velocidades y frenos V-brake. Para 6 a 11 años.', '/img/recortes/p08.webp', '/img/productos/p08.jpg'),
(9,  'Bici de equilibrio aro 12',   'ninos',      260000,  4,  1, 'Sin pedales, para que los más pequeños aprendan a mantener el equilibrio.', '/img/recortes/p09.webp', '/img/productos/p09.jpg'),
(10, 'Casco de ruta ventilado',     'accesorios', 100000,  24, 1, 'Casco liviano con 18 entradas de aire y ajuste por dial trasero.', '/img/recortes/p10.webp', '/img/productos/p10.jpg'),
(11, 'Casco MTB con visera',        'accesorios', 150000,  15, 1, 'Casco de montaña con visera, 16 entradas de aire y ajuste por dial trasero.', '/img/recortes/p11.webp', '/img/productos/p11.jpg'),
(12, 'Juego de luces USB',          'accesorios', 89000,   40, 1, 'Luz delantera y trasera recargables por USB-C, con 5 modos y hasta 12 horas de uso.', '/img/recortes/p12.webp', '/img/productos/p12.jpg'),
(13, 'Traje de ruta',               'accesorios', 200000,  18, 1, 'Jersey y culotte en lycra transpirable con badana de gel.', '/img/recortes/p13.webp', '/img/productos/p13.jpg'),
(14, 'Bomba de piso con manómetro', 'accesorios', 79000,   30, 1, 'Hasta 160 psi, compatible con válvulas Presta y Schrader.', '/img/recortes/p14.webp', '/img/productos/p14.jpg'),
(15, 'Kit de herramientas',         'accesorios', 379000,  12, 1, 'Multiherramienta de 24 funciones: llaves allen, destornilladores y troncha cadena.', '/img/recortes/p15.webp', '/img/productos/p15.jpg'),
(16, 'Candado en U',                'accesorios', 69000,   3,  1, 'Acero endurecido de 14 mm con dos llaves de seguridad.', '/img/recortes/p16.webp', '/img/productos/p16.jpg'),
(17, 'Caramañola 750 ml',           'accesorios', 45000,   0,  0, 'Botella de plástico flexible con válvula de chorro, para el portacaramañola.', '/img/recortes/p17.webp', '/img/productos/p17.jpg');
