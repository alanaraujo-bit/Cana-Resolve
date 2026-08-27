-- Códigos amigáveis: CR-00021, PR-0042, PA-0007.
--
-- Sequências em vez de contagem: `nextval` é atômico e não volta atrás nem
-- sob concorrência, então dois pedidos que chegam no mesmo instante nunca
-- disputam o mesmo número. A contrapartida — buracos quando uma transação é
-- desfeita — é irrelevante aqui: o código serve para conversar, não para
-- contar.

CREATE SEQUENCE IF NOT EXISTS service_request_code_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS prospect_code_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS partner_code_seq START WITH 1;
