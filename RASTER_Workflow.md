# So-Geo Raster Workflow Standard
**Status:** Stable  
**Validated on:** GeoServer + MapStore + Cesium environments

---

## Objective
Provide a robust, high-performance and repeatable method to turn raw orthophotos
into **web-ready, Cloud-Optimized GeoTIFFs (COG)** for publication.

---

## Directory Structure (Local Processing)
~/gis_work/
├── src/ → raw input data (never modified)
├── build/ → processing workspace
└── publish/ → final, validated deliverables

**Rules**
- `src/` remains untouched
- `build/` may be cleaned anytime
- `publish/` contains official outputs

---

## Processing Requirements

- Ubuntu / WSL
- GDAL (ubuntugis)
- QGIS for validation
- rsync for deployment

---

## Standard Processing Pipeline

### 1️⃣ Copy source file

```bash
cp /mnt/c/.../image.tif ~/gis_work/src/
Generate Web-Optimized COG (EPSG:3857)
cd ~/gis_work/build

gdalwarp \
  -t_srs EPSG:3857 \
  -r bilinear \
  -of COG \
  -co COMPRESS=JPEG \
  -co QUALITY=90 \
  -co BLOCKSIZE=512 \
  -co BIGTIFF=YES \
  ~/gis_work/src/INPUT.tif \
  OUTPUT_3857_cog.tif


Result expectations:

RGB (no alpha)

Pyramids embedded

Instant multi-scale rendering

Reasonable file size

3️⃣ Validation

Open in QGIS and check:

correct colors

no black borders

smooth zoom

correct CRS (EPSG:3857)

If black → redo.

4️⃣ Move to publish
cp OUTPUT_3857_cog.tif ~/gis_work/publish/

Deployment to GeoServer

Target path (recommended):

/opt/geoserver/data_dir/data/rasters/<project>/


Upload:

rsync -avz --progress \
  ~/gis_work/publish/OUTPUT_3857_cog.tif \
  user@SERVER:/opt/geoserver/data_dir/data/rasters/<project>/

GeoServer Configuration

1️⃣ Create New Store → GeoTIFF
2️⃣ URL:

file:data/rasters/<project>/OUTPUT_3857_cog.tif


3️⃣ CRS = EPSG:3857
4️⃣ Compute Bounding Box
5️⃣ Enable GeoWebCache + JPEG / PNG8
6️⃣ Save

MapStore

Add WMS layer

Expected result:

instant display

correct colors

smooth zoom

If black tiles:

Clear GeoWebCache

Notes & Best Practices

✔ COG is official So-Geo raster standard
✔ EPSG:3857 default for web
✔ Never rely on runtime reprojection
✔ Avoid YCbCr alpha TIFFs
✔ Always validate via QGIS
✔ Cache must be cleared after raster updates
