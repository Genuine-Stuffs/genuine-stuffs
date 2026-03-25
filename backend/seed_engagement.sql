-- SEED ENGAGEMENT DATA
-- Run this in your Supabase SQL Editor AFTER running seed_professionals.sql and professional_engagement.sql

DO $$
DECLARE
    v_effeh UUID;
    v_rahman UUID;
    v_morire UUID;
    v_adogie UUID;
BEGIN
    -- 1. Fetch IDs of specific experts
    SELECT id INTO v_effeh FROM professionals WHERE full_name = 'Victor Effeh';
    SELECT id INTO v_rahman FROM professionals WHERE full_name = 'Bilal Rahman';
    SELECT id INTO v_morire FROM professionals WHERE full_name = 'Morire Olusegun';
    SELECT id INTO v_adogie FROM professionals WHERE full_name = 'Adogie Ehizogie';

    -- Only proceed if experts were found
    IF v_effeh IS NOT NULL AND v_rahman IS NOT NULL THEN
        -- 2. Create ACCEPTED Connections (Mutual)
        -- Victor and Bilal are connected
        INSERT INTO professional_connections (requester_id, receiver_id, status)
        VALUES (v_effeh, v_rahman, 'accepted')
        ON CONFLICT DO NOTHING;
        
        -- Victor and Morire are connected
        INSERT INTO professional_connections (requester_id, receiver_id, status)
        VALUES (v_effeh, v_morire, 'accepted')
        ON CONFLICT DO NOTHING;

        -- 3. Create FOLLOWS
        -- Bilal follows Victor
        INSERT INTO professional_followers (follower_id, following_id)
        VALUES (v_rahman, v_effeh)
        ON CONFLICT DO NOTHING;

        -- Morire follows Bilal
        INSERT INTO professional_followers (follower_id, following_id)
        VALUES (v_morire, v_rahman)
        ON CONFLICT DO NOTHING;

        -- 4. Create PENDING Request
        -- Adogie requests to connect with Victor
        INSERT INTO professional_connections (requester_id, receiver_id, status)
        VALUES (v_adogie, v_effeh, 'pending')
        ON CONFLICT DO NOTHING;

        -- 5. Sample MESSAGES
        INSERT INTO professional_messages (sender_id, receiver_id, content) VALUES
        (v_effeh, v_rahman, 'Hello Bilal, I recorded the structural report for the Uyo site. Have you reviewed it?'),
        (v_rahman, v_effeh, 'Hi Victor, yes. The load calculations for the atrium look solid. I''ll send over the steel specs by noon.');

    END IF;
END $$;

-- Verify
SELECT p.full_name as sender, r.full_name as receiver, m.content
FROM professional_messages m
JOIN professionals p ON m.sender_id = p.id
JOIN professionals r ON m.receiver_id = r.id;
