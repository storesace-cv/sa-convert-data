import unittest

from app.backend.article_features import compute_article_features


class ArticleFeaturesTest(unittest.TestCase):
    def test_detects_multi_pack_mass_and_flags(self):
        nome = "Queijo Flamengo Continente 2x200 gr com sal"
        feat = compute_article_features(nome)

        self.assertEqual(
            feat.nome_norm,
            "QUEIJO FLAMENGO CONTINENTE 2X200 GR COM SAL",
        )
        self.assertEqual(
            feat.nome_sem_stop,
            "QUEIJO FLAMENGO CONTINENTE 2X200 GR SAL",
        )
        self.assertEqual(feat.quantidade_unidade, "G")
        self.assertEqual(feat.quantidade_valor, 200.0)
        self.assertEqual(feat.quantidade_total, 400.0)
        self.assertEqual(feat.quantidade_numero, 2.0)
        self.assertEqual(feat.quantidade_tipo, "MASS")
        self.assertTrue(feat.flag_com_sal)
        self.assertFalse(feat.flag_sem_sal)
        self.assertEqual(feat.marca_detectada, "CONTINENTE")

    def test_detects_decimal_mass_and_sem_sal_flag(self):
        nome = "Manteiga Milaneza 0,5kg sem sal"
        feat = compute_article_features(nome)

        self.assertEqual(feat.quantidade_unidade, "KG")
        self.assertAlmostEqual(feat.quantidade_valor, 500.0)
        self.assertAlmostEqual(feat.quantidade_total, 500.0)
        self.assertIsNone(feat.quantidade_numero)
        self.assertFalse(feat.flag_com_sal)
        self.assertTrue(feat.flag_sem_sal)
        self.assertEqual(feat.marca_detectada, "MILANEZA")

    def test_detects_volume_multipack(self):
        nome = "Sumo Gud 3x200ml"
        feat = compute_article_features(nome)

        self.assertEqual(feat.quantidade_unidade, "ML")
        self.assertEqual(feat.quantidade_valor, 200.0)
        self.assertEqual(feat.quantidade_total, 600.0)
        self.assertEqual(feat.quantidade_numero, 3.0)
        self.assertEqual(feat.quantidade_tipo, "VOLUME")
        self.assertEqual(feat.marca_detectada, "GUD")


if __name__ == "__main__":
    unittest.main()
