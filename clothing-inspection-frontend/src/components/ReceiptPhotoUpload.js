import React, { useRef } from 'react';
import { Box, Button, IconButton, ImageList, ImageListItem } from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';

const ReceiptPhotoUpload = ({ photos, setPhotos }) => {
  const inputRef = useRef();

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newPhotos = files.map(file => ({
      file,
      previewUrl: URL.createObjectURL(file)
    }));
    setPhotos([...photos, ...newPhotos]);
  };

  const handleDelete = (idx) => {
    const newPhotos = [...photos];
    URL.revokeObjectURL(newPhotos[idx].previewUrl);
    newPhotos.splice(idx, 1);
    setPhotos(newPhotos);
  };

  return (
    <Box>
      <Button
        variant="outlined"
        startIcon={<PhotoCamera />}
        onClick={() => inputRef.current.click()}
        sx={{ mb: 2 }}
      >
        사진 업로드
      </Button>
      <input
        type="file"
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        ref={inputRef}
        onChange={handleFileChange}
      />
      <ImageList cols={3} rowHeight={120} sx={{ width: '100%', mt: 1 }}>
        {photos.map((photo, idx) => (
          <ImageListItem key={idx}>
            <img src={photo.previewUrl} alt={`영수증${idx + 1}`} style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
            <IconButton
              size="small"
              onClick={() => handleDelete(idx)}
              sx={{ position: 'absolute', top: 2, right: 2, background: 'rgba(255,255,255,0.7)' }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </ImageListItem>
        ))}
      </ImageList>
    </Box>
  );
};

export default ReceiptPhotoUpload; 