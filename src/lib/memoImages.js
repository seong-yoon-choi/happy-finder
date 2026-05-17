import { Camera, CameraDirection, EncodingType, MediaTypeSelection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Media } from '@capacitor-community/media';

export const MEMO_IMAGE_BUCKET = 'memo-images';
export const MEMO_IMAGE_ALBUM_NAME = 'Happy Finder';
export const MEMO_IMAGE_MAX_COUNT = 4;

const LOCAL_MEMO_IMAGE_DIR = 'memo-images';
const IMAGE_TARGET_SIZE = 1600;
const IMAGE_QUALITY = 76;
const DEFAULT_IMAGE_FORMAT = 'jpeg';
const DEFAULT_IMAGE_CONTENT_TYPE = 'image/jpeg';

export const isNativeMemoImageAvailable = () => Capacitor.isNativePlatform();

export const createMemoImageId = () => `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

const normalizeImageFormat = format => {
  const normalized = typeof format === 'string' ? format.toLowerCase().trim() : '';

  if (normalized === 'jpg' || normalized === 'jpeg') {
    return 'jpeg';
  }

  if (normalized === 'png' || normalized === 'webp') {
    return normalized;
  }

  return DEFAULT_IMAGE_FORMAT;
};

const getImageContentType = format => {
  const normalized = normalizeImageFormat(format);

  if (normalized === 'png') {
    return 'image/png';
  }

  if (normalized === 'webp') {
    return 'image/webp';
  }

  return DEFAULT_IMAGE_CONTENT_TYPE;
};

const getImageExtension = format => {
  const normalized = normalizeImageFormat(format);
  return normalized === 'jpeg' ? 'jpg' : normalized;
};

const base64ToBlob = (base64, contentType = DEFAULT_IMAGE_CONTENT_TYPE) => {
  const byteCharacters = atob(base64);
  const byteArrays = [];
  const sliceSize = 1024;

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);
    const byteNumbers = new Array(slice.length);

    for (let index = 0; index < slice.length; index += 1) {
      byteNumbers[index] = slice.charCodeAt(index);
    }

    byteArrays.push(new Uint8Array(byteNumbers));
  }

  return new Blob(byteArrays, { type: contentType });
};

const getBase64FromMediaResult = async mediaResult => {
  if (mediaResult?.uri) {
    const { data } = await Filesystem.readFile({ path: mediaResult.uri });

    if (typeof data === 'string') {
      return data;
    }
  }

  if (typeof mediaResult?.thumbnail === 'string' && mediaResult.thumbnail) {
    return mediaResult.thumbnail.replace(/^data:image\/[^;]+;base64,/, '');
  }

  throw new Error('MEMO_IMAGE_READ_FAILED');
};

const getMemoImageFileName = ({ imageId, format }) => (
  `${imageId}.${getImageExtension(format)}`
);

const getLocalMemoImagePath = ({ itemId, memoId, imageId, format }) => (
  `${LOCAL_MEMO_IMAGE_DIR}/${itemId}/${memoId}/${getMemoImageFileName({ imageId, format })}`
);

const getCloudMemoImagePath = ({ userId, itemId, memoId, imageId, format }) => (
  `${userId}/${itemId}/${memoId}/${getMemoImageFileName({ imageId, format })}`
);

export const requestMemoCameraPermission = async () => {
  const permissions = await Camera.requestPermissions({ permissions: ['camera'] });
  return permissions.camera === 'granted' || permissions.camera === 'limited';
};

export const requestMemoPhotoPermission = async () => {
  if (Capacitor.getPlatform() === 'android') {
    return true;
  }

  const permissions = await Camera.requestPermissions({ permissions: ['photos'] });
  return permissions.photos === 'granted' || permissions.photos === 'limited';
};

export const takeMemoPhoto = async () => {
  const hasPermission = await requestMemoCameraPermission();

  if (!hasPermission) {
    return { success: false, code: 'CAMERA_PERMISSION_DENIED' };
  }

  try {
    const photo = await Camera.takePhoto({
      quality: IMAGE_QUALITY,
      targetWidth: IMAGE_TARGET_SIZE,
      targetHeight: IMAGE_TARGET_SIZE,
      correctOrientation: true,
      encodingType: EncodingType.JPEG,
      saveToGallery: false,
      cameraDirection: CameraDirection.Rear,
      includeMetadata: true
    });

    return { success: true, photo };
  } catch (error) {
    return {
      success: false,
      code: error?.code || 'CAMERA_CAPTURE_FAILED'
    };
  }
};

export const chooseMemoPhoto = async () => {
  const hasPermission = await requestMemoPhotoPermission();

  if (!hasPermission) {
    return { success: false, code: 'PHOTO_PERMISSION_DENIED' };
  }

  try {
    const { results } = await Camera.chooseFromGallery({
      mediaType: MediaTypeSelection.Photo,
      allowMultipleSelection: false,
      quality: IMAGE_QUALITY,
      targetWidth: IMAGE_TARGET_SIZE,
      targetHeight: IMAGE_TARGET_SIZE,
      correctOrientation: true,
      includeMetadata: true
    });

    const photo = Array.isArray(results) ? results[0] : null;

    if (!photo) {
      return { success: false, code: 'PHOTO_PICK_CANCELLED' };
    }

    return { success: true, photo };
  } catch (error) {
    return {
      success: false,
      code: error?.code || 'PHOTO_PICK_FAILED'
    };
  }
};

export const persistMemoImage = async ({
  supabase,
  authUserId,
  itemId,
  memoId,
  mediaResult,
  source
}) => {
  const imageId = createMemoImageId();
  const format = normalizeImageFormat(mediaResult?.metadata?.format);
  const contentType = getImageContentType(format);
  const base64 = await getBase64FromMediaResult(mediaResult);
  const nowIso = new Date().toISOString();
  const size = Number.isFinite(mediaResult?.metadata?.size) ? mediaResult.metadata.size : null;
  const resolution = typeof mediaResult?.metadata?.resolution === 'string' ? mediaResult.metadata.resolution : null;
  const normalizedSource = source === 'camera' || source === 'gallery' ? source : null;

  if (supabase && authUserId) {
    const path = getCloudMemoImagePath({
      userId: authUserId,
      itemId,
      memoId,
      imageId,
      format
    });

    const { error } = await supabase.storage
      .from(MEMO_IMAGE_BUCKET)
      .upload(path, base64ToBlob(base64, contentType), {
        cacheControl: '3600',
        contentType,
        upsert: false
      });

    if (error) {
      throw error;
    }

    return {
      id: imageId,
      storageType: 'cloud',
      path,
      contentType,
      size,
      resolution,
      source: normalizedSource,
      createdAt: nowIso
    };
  }

  const path = getLocalMemoImagePath({
    itemId,
    memoId,
    imageId,
    format
  });

  await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Data,
    recursive: true
  });

  return {
    id: imageId,
    storageType: 'local',
    path,
    contentType,
    size,
    resolution,
    source: normalizedSource,
    createdAt: nowIso
  };
};

export const readMemoImageAsDataUrl = async image => {
  if (!image?.path) {
    return '';
  }

  const { data } = await Filesystem.readFile({
    path: image.path,
    directory: Directory.Data
  });

  if (typeof data !== 'string') {
    return '';
  }

  return `data:${image.contentType || DEFAULT_IMAGE_CONTENT_TYPE};base64,${data}`;
};

export const getMemoImageSrc = async ({ image, supabase }) => {
  if (!image?.path) {
    return '';
  }

  if (image.storageType === 'cloud') {
    if (!supabase) {
      return '';
    }

    const { data, error } = await supabase.storage
      .from(MEMO_IMAGE_BUCKET)
      .createSignedUrl(image.path, 60 * 60);

    if (error || !data?.signedUrl) {
      return '';
    }

    return data.signedUrl;
  }

  try {
    const { uri } = await Filesystem.getUri({
      path: image.path,
      directory: Directory.Data
    });

    return Capacitor.convertFileSrc(uri);
  } catch {
    return readMemoImageAsDataUrl(image);
  }
};

export const deleteMemoStoredImages = async ({ images, supabase }) => {
  const normalizedImages = Array.isArray(images) ? images : [];
  const cloudPaths = normalizedImages
    .filter(image => image?.storageType === 'cloud' && image.path)
    .map(image => image.path);
  const localImages = normalizedImages
    .filter(image => image?.storageType === 'local' && image.path);

  await Promise.allSettled([
    ...localImages.map(image => Filesystem.deleteFile({
      path: image.path,
      directory: Directory.Data
    })),
    cloudPaths.length > 0 && supabase
      ? supabase.storage.from(MEMO_IMAGE_BUCKET).remove(cloudPaths)
      : Promise.resolve()
  ]);
};

export const uploadLocalMemoImageToCloud = async ({
  image,
  supabase,
  authUserId,
  itemId,
  memoId
}) => {
  if (!image?.path || !supabase || !authUserId) {
    return null;
  }

  const { data } = await Filesystem.readFile({
    path: image.path,
    directory: Directory.Data
  });

  if (typeof data !== 'string') {
    return null;
  }

  const format = normalizeImageFormat(image.contentType?.replace('image/', ''));
  const contentType = image.contentType || getImageContentType(format);
  const cloudPath = getCloudMemoImagePath({
    userId: authUserId,
    itemId,
    memoId,
    imageId: image.id || createMemoImageId(),
    format
  });

  const { error } = await supabase.storage
    .from(MEMO_IMAGE_BUCKET)
    .upload(cloudPath, base64ToBlob(data, contentType), {
      cacheControl: '3600',
      contentType,
      upsert: true
    });

  if (error) {
    throw error;
  }

  return {
    ...image,
    storageType: 'cloud',
    path: cloudPath,
    contentType,
    migratedAt: new Date().toISOString()
  };
};

const getOrCreateAndroidAlbumIdentifier = async () => {
  if (Capacitor.getPlatform() !== 'android') {
    return undefined;
  }

  const findAlbum = async () => {
    const { albums } = await Media.getAlbums();
    return Array.isArray(albums)
      ? albums.find(album => album?.name === MEMO_IMAGE_ALBUM_NAME)
      : null;
  };

  const existingAlbum = await findAlbum();

  if (existingAlbum?.identifier) {
    return existingAlbum.identifier;
  }

  await Media.createAlbum({ name: MEMO_IMAGE_ALBUM_NAME });
  const createdAlbum = await findAlbum();
  return createdAlbum?.identifier;
};

export const saveMemoImageToGallery = async ({ image, supabase }) => {
  if (!isNativeMemoImageAvailable()) {
    return { success: false, code: 'NATIVE_ONLY' };
  }

  try {
    let path = '';

    if (image?.storageType === 'cloud') {
      path = await getMemoImageSrc({ image, supabase });
    } else if (image?.storageType === 'local') {
      const { uri } = await Filesystem.getUri({
        path: image.path,
        directory: Directory.Data
      });
      path = uri;
    }

    if (!path) {
      return { success: false, code: 'IMAGE_NOT_FOUND' };
    }

    const albumIdentifier = await getOrCreateAndroidAlbumIdentifier();
    await Media.savePhoto({
      path,
      albumIdentifier,
      fileName: image?.id || createMemoImageId()
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      code: error?.code || 'SAVE_TO_GALLERY_FAILED'
    };
  }
};
