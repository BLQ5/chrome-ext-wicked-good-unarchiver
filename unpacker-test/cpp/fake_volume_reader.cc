// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

#include "fake_volume_reader.h"

FakeVolumeReader::FakeVolumeReader() {}
FakeVolumeReader::~FakeVolumeReader() {}

int FakeVolumeReader::Open() {
  return ARCHIVE_OK;
}

ssize_t FakeVolumeReader::Read(size_t bytes_to_read,
                               const void** destination_buffer) {
  return 0;  // Not important.
}

int64_t FakeVolumeReader::Skip(int64_t bytes_to_skip) {
  return 0;  // Not important.
}

int64_t FakeVolumeReader::Seek(int64_t offset, int whence) {
  return 0;  // Not important.
}

int64_t FakeVolumeReader::GetOffset() const {
  return 0;
}

int FakeVolumeReader::Close() {
  return ARCHIVE_OK;
}
