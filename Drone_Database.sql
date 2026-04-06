-- ===================================
-- DRONE COMMAND DATABASE
-- ===================================

CREATE DATABASE IF NOT EXISTS drone_command;
USE drone_command;

-- ===================================
-- USERS TABLE
-- ===================================

CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    username    VARCHAR(50) NOT NULL UNIQUE,
    password    VARCHAR(255) NOT NULL,
    full_name   VARCHAR(100) NOT NULL,
    role        ENUM('admin', 'operator') NOT NULL DEFAULT 'operator',
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO users (username, password, full_name, role) VALUES
('cmd_admin',   'Admin@1234',  'Command Administrator', 'admin'),
('j_mitchell',  'Pilot@5678',  'Lt. James Mitchell',    'operator'),
('s_chen',      'Recon@9012',  'Cpt. Sarah Chen',       'operator'),
('r_torres',    'Supply@3456', 'Sgt. Ramon Torres',     'operator');

-- ===================================
-- DRONES TABLE
-- ===================================

CREATE TABLE IF NOT EXISTS drones (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    type            ENUM('recon', 'attack', 'supply') NOT NULL,
    range_km        INT NOT NULL,
    payload_kg      INT NOT NULL,
    endurance_hrs   DECIMAL(4,1) NOT NULL,
    stealth_level   ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'low',
    sensors         VARCHAR(255),
    delivery_mode   ENUM('drop', 'land', 'none') NOT NULL DEFAULT 'none',
    strike_mode     ENUM('precision', 'area_suppression', 'none') NOT NULL DEFAULT 'none',
    drone_condition ENUM('optimal', 'good', 'damaged', 'under_maintenance') NOT NULL DEFAULT 'optimal'
);

INSERT INTO drones (name, type, range_km, payload_kg, endurance_hrs, stealth_level, sensors, delivery_mode, strike_mode, drone_condition) VALUES

-- ===================================
-- RECON DRONES
-- ===================================

('IAI Heron', 'recon', 1000, 250, 45.0, 'low',
'MOSP3000 Electro-optical cameras, EL/M2055 SAR radar, ELK 7071 COMINT/direction-finding system',
'none', 'none', 'optimal'),

('Rustom-II', 'recon', 250, 350, 18.0, 'medium',
'COMINT, ELINT, Synthetic Aperture Radar, Medium and Long range electro-optical systems, GAGAN SATCOM navigation',
'none', 'none', 'optimal'),

('Trinetra UAV', 'recon', 150, 15, 11.0, 'low',
'8 cameras for obstacle navigation, 2 thermal cameras, IR/EO image analyser, GNSS Receiver, Automated Multilayer Echelon Controller',
'none', 'none', 'optimal'),

('Searcher', 'recon', 300, 85, 18.0, 'low',
'Electro-optical sensors, day/night surveillance cameras, SAR radar',
'none', 'none', 'optimal'),

('Black Hornet', 'recon', 2, 0, 0.4, 'medium',
'3 electro-optical cameras (forward, 45deg, downward), long-wave infrared, day/night video sensors',
'none', 'none', 'optimal'),

('DRDO Netra', 'recon', 3, 0, 0.5, 'low',
'High-resolution CCD cameras, thermal cameras, VTOL capability, GPS navigation',
'none', 'none', 'optimal'),

('Rooster', 'recon', 1, 0, 1.0, 'low',
'6 high-resolution cameras for obstacle detection, 2 thermal cameras for low-light and concealed target detection',
'none', 'none', 'optimal'),

('SWITCH Drone', 'recon', 15, 6, 2.0, 'low',
'Day payload with 25X optical zoom, thermal imaging night payload, waypoint-based navigation',
'none', 'none', 'optimal'),

-- ===================================
-- ATTACK DRONES
-- ===================================

('Heron TP', 'attack', 7400, 1000, 36.0, 'medium',
'Thermographic infrared camera, visible-light airborne surveillance, COMINT, ELINT, SATCOM relay',
'none', 'precision', 'optimal'),

('MQ-9 Reaper', 'attack', 1850, 1700, 27.0, 'low',
'Electro-optical/Infrared MTS-B targeting system, Lynx multimode SAR radar, Electronic support measures, GPS/INS, L3 COMINT suite',
'none', 'precision', 'optimal'),

('DRDO Aura (Ghatak)', 'attack', 2500, 1500, 5.5, 'high',
'Stealth low radar cross-section airframe, internal weapon bays, advanced targeting systems',
'none', 'precision', 'optimal'),

('Harpy', 'attack', 500, 32, 6.0, 'low',
'Anti-radiation seeker with wide RF coverage, autonomous radar targeting, vertical attack capability',
'none', 'area_suppression', 'optimal'),

('Nagastra-1', 'attack', 30, 9, 1.0, 'low',
'Day and night surveillance cameras, GPS precision strike under 2m accuracy',
'none', 'precision', 'optimal'),

('Swarm Drone Unit', 'attack', 50, 2, 1.5, 'low',
'AI coordination system, multi-role sensors, communication jamming capability',
'none', 'area_suppression', 'optimal'),

-- ===================================
-- SUPPLY DRONES
-- ===================================

('SWITCH Drone (Cargo)', 'supply', 15, 6, 2.0, 'low',
'Swappable cargo payload bay, waypoint-based autonomous navigation',
'drop', 'none', 'optimal'),

('Kaman K-MAX', 'supply', 560, 2722, 12.0, 'low',
'Autonomous flight system, LIDAR obstacle avoidance, EO/IR sensors, GPS-guided sling load delivery, multi-hook carousel system',
'drop', 'none', 'optimal'),

('TRV-150C', 'supply', 70, 68, 0.6, 'low',
'Autonomous eVTOL, waypoint navigation via ATAK app, redundant avionics, day/night operation capability',
'land', 'none', 'optimal'),

('FVR-90', 'supply', 80, 9, 16.0, 'low',
'Autonomous VTOL, GPS navigation, refrigerated delivery pods for medical supplies, obstacle avoidance',
'drop', 'none', 'optimal'),

('DJI FlyCart 30', 'supply', 16, 30, 0.5, 'low',
'Cargo and winch delivery modes, phased array radar, dual binocular vision, ADS-B receiver, 4G connectivity, FPV gimbal camera',
'drop', 'none', 'optimal'),

('Kaman KARGO', 'supply', 483, 227, 8.0, 'low',
'Near Earth autonomy software, safe landing detection, obstacle avoidance, autonomous mission planning, medevac configuration capable',
'land', 'none', 'optimal');