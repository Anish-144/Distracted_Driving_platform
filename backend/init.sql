-- DB initialization script (runs once on first docker-compose up)
-- Seeds the 3 core scenarios for Week 1

-- Ensure the scenarios table is ready (it will be created by SQLAlchemy, but we seed via SQL)
-- This runs AFTER the API has initialized tables via init_db().
-- In production, consider using Alembic migrations instead.

-- NOTE: The API's lifespan hook calls init_db() which creates tables first.
-- This file seeds the scenarios table if it's empty.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scenarios') THEN
        INSERT INTO scenarios (id, name, description, distraction_type, difficulty_level, is_active, instruction_text)
        VALUES
            ('scenario-001', 'Incoming Phone Call',
             'Your phone rings while driving. A call from an unknown number flashes on screen.',
             'incoming_call', 'medium', true,
             'Your phone is ringing! What do you do?'),

            ('scenario-002', 'WhatsApp Notification',
             'A WhatsApp message notification buzzes. The preview shows an urgent message from a friend.',
             'whatsapp_notification', 'easy', true,
             'You just got a WhatsApp message. How do you respond?'),

            ('scenario-003', 'GPS Rerouting Alert',
             'Your GPS app is recalculating the route and shows a new turn coming in 200 meters.',
             'gps_rerouting', 'hard', true,
             'Your GPS is rerouting. Do you look at the screen while driving?')
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
