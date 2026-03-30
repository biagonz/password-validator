# ── Módulo: s3-frontend ───────────────────────────────────────────────────────
# Cria um bucket S3 configurado para servir arquivos estáticos via CloudFront.
#
# Não habilita "static website hosting" do S3 — isso exporia o bucket
# publicamente. Em vez disso, usa Origin Access Control (OAC) para que apenas
# o CloudFront possa ler o bucket.
# ──────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "this" {
  bucket = var.bucket_name
}

# Bloqueia qualquer acesso público direto ao bucket
resource "aws_s3_bucket_public_access_block" "this" {
  bucket                  = aws_s3_bucket.this.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Política que permite apenas ao CloudFront (via OAC) ler os objetos do bucket
resource "aws_s3_bucket_policy" "this" {
  bucket = aws_s3_bucket.this.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowCloudFrontOAC"
        Effect = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.this.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = var.cloudfront_distribution_arn
          }
        }
      }
    ]
  })
}
